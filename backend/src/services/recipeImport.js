const XLSX = require('xlsx');
const { createHash } = require('crypto');
const Ingredient = require('../models/Ingredient');
const Item = require('../models/Item');
const { normalizeSource } = require('./retailerPricing');

const key = value => String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
const bad = message => Object.assign(new Error(message), { statusCode: 400 });
const number = value => value == null || String(value).trim() === '' ? NaN : Number(value);
const id = (type, name) => createHash('sha256').update(JSON.stringify([type, name])).digest('hex').slice(0, 24);

function measurement(value) {
  const text = key(value).replace(/[½¼¾]/g, fraction => ({ '½': ' 1/2', '¼': ' 1/4', '¾': ' 3/4' })[fraction]).trim();
  const match = text.match(/^(?:(\d+)\s+)?(\d+\/\d+|\d+(?:\.\d+)?)\s*([a-z]+)(?: garnish)?$/);
  if (!match) return { amount: /^\d+(?:\.\d+)?$/.test(text) ? Number(text) : null, unit: '' };
  const [, whole, quantity, unit] = match;
  const [numerator, denominator = 1] = quantity.split('/').map(Number);
  const amount = Number(whole || 0) + numerator / denominator;
  return { amount: Number.isFinite(amount) ? amount : null, unit };
}

function isRecipeHeader(title, ingredient, measure) {
  return Boolean(key(title)) && /^(ingredients?|ingridients?)$/.test(key(ingredient)) && /^measurements?$/.test(key(measure));
}

function detectRecipeWorkbook(workbook) {
  const hasRecipeHeader = workbook.SheetNames.some(name => {
    const sheet = workbook.Sheets[name];
    return Object.keys(sheet).some(address => {
      const row = /^B(\d+)$/.exec(address)?.[1];
      return row && isRecipeHeader(sheet[`A${row}`]?.v, sheet[address].v, sheet[`C${row}`]?.v);
    });
  });
  return hasRecipeHeader ? readRecipes(workbook) : null;
}

function parseRecipeWorkbook(buffer) {
  return readRecipes(XLSX.read(buffer, { type: 'buffer', sheetRows: 5001 }));
}

function readRecipes(workbook) {
  const recipes = [];
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet['!ref']) continue;
    const range = XLSX.utils.decode_range(sheet['!fullref'] || sheet['!ref']);
    if (range.e.r >= 5000) throw bad('Recipe sheets can contain up to 5,000 rows.');
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: { s: { r: 0, c: 0 }, e: { r: range.e.r, c: 2 } } });
    let category = 'Kitchen';
    let recipe;
    for (const [title, ingredient, measure] of rows) {
      const name = String(title ?? '').trim();
      if (isRecipeHeader(name, ingredient, measure)) {
        recipe = { name, category, prep: /\bpreparation\b/i.test(category), lines: [] };
        recipes.push(recipe);
      } else if (name && !ingredient && !measure) {
        category = name;
        recipe = null;
      } else if (recipe && !name && key(ingredient)) {
        recipe.lines.push({ name: String(ingredient).trim(), original: String(measure ?? '').trim(), ...measurement(measure) });
      }
    }
  }
  const populated = recipes.filter(recipe => recipe.lines.length);
  if (!populated.length) throw bad('No kitchen recipes found. Each recipe needs its name in column A, Ingredients in B, Measurements in C, and ingredient rows below.');
  if (populated.reduce((sum, recipe) => sum + recipe.lines.length, 0) > 400) throw bad('Import up to 400 ingredient rows at a time.');
  return populated;
}

async function planRecipeImport(recipes, additions) {
  if (!Array.isArray(recipes) || !recipes.length || recipes.length > 400 || !Array.isArray(additions) || additions.length > 400) {
    throw bad('Upload and review a recipe workbook first.');
  }
  const [library, items] = await Promise.all([
    Ingredient.find().lean(),
    Item.find().select('name category').lean(),
  ]);
  const sources = new Map(library.filter(source => source.isActive !== false).map(source => [String(source._id), source]));
  const documents = [];
  const newSources = new Map();
  const usedSources = new Set();
  const prepIndexes = new Map();
  const identities = new Set();
  const itemKey = recipe => JSON.stringify([key(recipe.name), key(recipe.category)]);
  const existingItems = new Set(items.map(itemKey));
  const existingNames = new Set(library.map(source => key(source.name)));
  for (const addition of additions) {
    if (!addition || typeof addition !== 'object') throw bad('Invalid missing ingredient.');
    const { name, unit, cost, source, tag } = addition;
    const costPerUnit = number(cost);
    if (typeof name !== 'string' || typeof unit !== 'string' || !key(name) || !key(unit) || !Number.isFinite(costPerUnit) || costPerUnit < 0) {
      throw bad(`Enter a unit and price for ${name || 'each missing ingredient'}.`);
    }
    const _id = id('recipe ingredient', key(name));
    const existing = sources.get(_id);
    if (existing) {
      if (key(existing.unit) !== key(unit)) throw bad(`The unit for ${name} changed. Reload the workbook.`);
      newSources.set(key(name), existing);
      continue;
    }
    if (existingNames.has(key(name))) throw bad(`${name} already exists. Match it to the library before importing.`);
    if (newSources.has(key(name))) throw bad(`Duplicate missing ingredient: ${name}.`);
    const document = new Ingredient({
      _id, name, unit, costPerUnit, category: 'Kitchen',
      retailerSource: normalizeSource(source), retailerSearchTag: tag,
    });
    await document.validate();
    newSources.set(key(name), document);
  }

  let lineCount = 0;
  recipes.forEach((recipe, index) => {
    if (typeof recipe?.name !== 'string' || typeof recipe.category !== 'string' || !key(recipe.name) || !key(recipe.category) || !Array.isArray(recipe.lines) || !recipe.lines.length || recipe.lines.length > 400) {
      throw bad('Each recipe needs a name, category, and ingredient lines.');
    }
    lineCount += recipe.lines.length;
    if (lineCount > 400) throw bad('Import up to 400 ingredient rows at a time.');
    const identity = recipe.prep ? `prep:${key(recipe.name)}` : itemKey(recipe);
    if (identities.has(identity)) throw bad(`Duplicate recipe: ${recipe.name} (${recipe.category}).`);
    identities.add(identity);
    if (recipe.prep) prepIndexes.set(index, recipe);
  });

  const results = new Map();
  const visiting = new Set();
  function resolve(index) {
    if (results.has(index)) return results.get(index);
    const recipe = recipes[index];
    if (visiting.has(index)) throw bad(`Circular preparation reference at ${recipe.name}.`);
    visiting.add(index);
    const prepName = `Prep: ${recipe.name.trim()}`;
    const existingPrep = recipe.prep && library.find(source => key(source.name) === key(prepName));
    if (existingPrep && (!existingPrep.isPrep || existingPrep.isActive === false || key(existingPrep.unit) !== key(recipe.unit))) {
      throw bad(`Check the existing library entry and yield unit for ${prepName}.`);
    }
    const existing = existingPrep || (!recipe.prep && existingItems.has(itemKey(recipe)));
    const lines = recipe.lines.flatMap(line => {
      if (!line || typeof line.source !== 'string') throw bad(`Invalid ingredient line in ${recipe.name}.`);
      const quantity = number(line.quantity);
      if (!Number.isFinite(quantity) || quantity < 0) throw bad(`Confirm the quantity for ${line.name} in ${recipe.name}.`);
      if (quantity === 0) return [];
      let ingredient;
      if (line.source?.startsWith('prep:')) {
        const prepIndex = Number(line.source.slice(5));
        if (!prepIndexes.has(prepIndex)) throw bad(`Unknown preparation for ${line.name}.`);
        ingredient = resolve(prepIndex).document;
      } else if (line.source === 'new') {
        ingredient = newSources.get(key(line.name));
        if (ingredient && !existing) usedSources.add(ingredient);
      } else {
        ingredient = sources.get(line.source);
      }
      if (!ingredient) throw bad(`Choose an ingredient for ${line.name} in ${recipe.name}.`);
      if (key(line.unit) !== key(ingredient.unit)) throw bad(`The unit for ${line.name} changed. Review the quantity in ${recipe.name}.`);
      return [{ ingredientId: ingredient._id, name: ingredient.name, quantity, unit: ingredient.unit, costPerUnit: ingredient.costPerUnit }];
    });
    if (!lines.length) throw bad(`Include at least one ingredient in ${recipe.name}.`);
    const total = lines.reduce((sum, line) => sum + line.quantity * line.costPerUnit, 0);
    const yieldAmount = number(recipe.yield);
    if (recipe.prep && (!key(recipe.unit) || !Number.isFinite(yieldAmount) || yieldAmount <= 0)) {
      throw bad(`Enter the measured batch yield and unit for ${recipe.name}.`);
    }
    const document = recipe.prep
      ? existingPrep || new Ingredient({
        _id: id('recipe prep', key(prepName)), name: prepName, category: recipe.category, unit: recipe.unit,
        isPrep: true, totalOutput: yieldAmount, costPerUnit: total / yieldAmount, prepIngredients: lines,
      })
      : new Item({ _id: id('recipe product', itemKey(recipe)), name: recipe.name, category: recipe.category, ingredients: lines });
    if (!existing) documents.push(document);
    const result = { document, summary: {
      name: recipe.name, category: recipe.category, prep: Boolean(recipe.prep), existing: Boolean(existing), total,
      costPerUnit: recipe.prep ? document.costPerUnit : total, unit: recipe.prep ? document.unit : 'product',
    } };
    visiting.delete(index);
    results.set(index, result);
    return result;
  }

  const summary = recipes.map((_, index) => resolve(index).summary);
  const writes = [...[...usedSources].filter(source => source instanceof Ingredient), ...documents];
  for (const document of writes) await document.validate();
  return { summary, writes };
}

async function saveRecipeImport(writes) {
  // Create in dependency order. Stable IDs make a retry resume without duplicating records.
  for (const document of writes) {
    const { _id, ...fields } = document.toObject({ virtuals: false });
    const now = new Date();
    const result = await document.constructor.updateOne(
      { _id },
      { $setOnInsert: { ...fields, createdAt: now, updatedAt: now } },
      { upsert: true, timestamps: false },
    );
    if (result.matchedCount && document instanceof Ingredient) {
      const stored = await Ingredient.findById(_id).select('unit costPerUnit').lean();
      if (!stored || stored.unit !== document.unit || stored.costPerUnit !== document.costPerUnit) {
        throw Object.assign(new Error(`${document.name} changed during import. Preview the recipes again.`), { statusCode: 409 });
      }
    }
  }
}

module.exports = { detectRecipeWorkbook, parseRecipeWorkbook, planRecipeImport, saveRecipeImport };
