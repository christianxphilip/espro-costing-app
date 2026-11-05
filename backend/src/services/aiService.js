const fetch = require('node-fetch');

/**
 * Get AI pricing suggestion using Hugging Face free API
 * @param {Object} item - Item object with name, category, cogs, profitMargin
 * @returns {Promise<Object>} AI suggestion with price and reasoning
 */
const getAISuggestion = async (item) => {
  try {
    // Use Hugging Face Inference API (free tier)
    const HF_API_URL = 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2';
    const HF_API_KEY = process.env.HF_API_KEY;

    const prompt = `You are a pricing consultant for cafés in the Philippines. 

Suggest a fair selling price for this café item:
- Item Name: ${item.name}
- Category: ${item.category}
- Total COGS (Cost of Goods Sold): ₱${item.cogs.toFixed(2)}
- Target Profit Margin: ${item.profitMargin}%
- Formula-based price: ₱${item.suggestedPrice.toFixed(2)}

Provide:
1. Your recommended selling price (in PHP)
2. Brief reasoning (max 100 words)

Keep your response concise and practical for café owners.`;

    // If no API key, return formula-based suggestion
    if (!HF_API_KEY || HF_API_KEY === 'your_huggingface_api_key_optional') {
      return {
        suggestedPrice: item.suggestedPrice,
        reasoning: `Based on standard costing formula: COGS (₱${item.cogs.toFixed(2)}) × (1 + ${item.profitMargin}% margin) = ₱${item.suggestedPrice.toFixed(2)}. This ensures ${item.profitMargin}% profit while covering all costs. Consider local market prices and competitor pricing for final adjustments.`,
        source: 'formula',
      };
    }

    // Call Hugging Face API
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 200,
          temperature: 0.7,
          top_p: 0.95,
          return_full_text: false,
        },
      }),
    });

    if (!response.ok) {
      // Handle specific HTTP error codes
      if (response.status === 410) {
        throw new Error('AI model no longer available (410 Gone)');
      } else if (response.status === 503) {
        throw new Error('AI model is loading, please try again in a moment');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      }
      throw new Error(`Hugging Face API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    // Parse AI response
    let aiText = '';
    if (Array.isArray(result) && result.length > 0) {
      aiText = result[0].generated_text || '';
    } else if (result.generated_text) {
      aiText = result.generated_text;
    }

    // Extract price from AI response (look for PHP/₱ amounts)
    const priceMatch = aiText.match(/₱?\s*(\d+(?:\.\d{2})?)/);
    const aiPrice = priceMatch ? parseFloat(priceMatch[1]) : item.suggestedPrice;

    return {
      suggestedPrice: aiPrice,
      reasoning: aiText.trim() || `AI suggests ₱${aiPrice.toFixed(2)} based on market analysis and cost structure.`,
      source: 'ai',
    };

  } catch (error) {
    console.error('AI Service Error:', error.message);
    
    // Smart price rounding for psychological pricing
    const smartPrice = smartRoundPrice(item.suggestedPrice);
    
    // Fallback to smart formula-based pricing
    return {
      suggestedPrice: smartPrice,
      reasoning: `Smart pricing based on COGS (₱${item.cogs.toFixed(2)}) with ${item.profitMargin}% margin, rounded to ₱${smartPrice.toFixed(2)} for psychological appeal. ${error.message.includes('410') ? 'AI service updated, using enhanced formula.' : 'AI service temporarily unavailable.'}`,
      source: 'formula-smart',
      error: error.message,
    };
  }
}

// Smart price rounding for psychological pricing
function smartRoundPrice(price) {
  if (price < 50) {
    // Round to nearest 5 for small amounts
    return Math.round(price / 5) * 5;
  } else if (price < 100) {
    // Round to X9 (₱39, ₱49, ₱59, etc.)
    const base = Math.floor(price / 10) * 10;
    return base + 9;
  } else if (price < 200) {
    // Round to X5 or X9
    const base = Math.floor(price / 10) * 10;
    const remainder = price - base;
    return remainder < 5 ? base + 5 : base + 9;
  } else {
    // Round to nearest 10, then subtract 1 (₱99, ₱149, ₱199, etc.)
    return Math.ceil(price / 10) * 10 - 1;
  }
}

/**
 * Get pricing insights and optimization tips
 * @param {Array} items - Array of items
 * @returns {Object} Insights and recommendations
 */
const getPricingInsights = (items) => {
  if (!items || items.length === 0) {
    return {
      insights: [],
      recommendations: [],
    };
  }

  const insights = [];
  const recommendations = [];

  // Calculate average margin
  const avgMargin = items.reduce((sum, item) => sum + item.profitMargin, 0) / items.length;
  insights.push(`Average profit margin across all items: ${avgMargin.toFixed(1)}%`);

  // Find high-cost items
  const highCostItems = items.filter(item => {
    const ingredientCost = item.ingredients.reduce(
      (sum, ing) => sum + (ing.quantity * ing.costPerUnit), 0
    );
    return ingredientCost > 50;
  });

  if (highCostItems.length > 0) {
    insights.push(`${highCostItems.length} items have high ingredient costs (>₱50)`);
    recommendations.push('Consider bulk purchasing or alternative suppliers for high-cost items');
  }

  // Find low-margin items
  const lowMarginItems = items.filter(item => item.profitMargin < 25);
  if (lowMarginItems.length > 0) {
    insights.push(`${lowMarginItems.length} items have margins below 25%`);
    recommendations.push('Review pricing strategy for low-margin items to ensure profitability');
  }

  // Find items with many ingredients
  const complexItems = items.filter(item => item.ingredients.length > 5);
  if (complexItems.length > 0) {
    recommendations.push('Simplify recipes with many ingredients to reduce preparation time and costs');
  }

  // Category analysis
  const categories = {};
  items.forEach(item => {
    if (!categories[item.category]) {
      categories[item.category] = { count: 0, totalMargin: 0 };
    }
    categories[item.category].count++;
    categories[item.category].totalMargin += item.profitMargin;
  });

  Object.keys(categories).forEach(category => {
    const avgCategoryMargin = categories[category].totalMargin / categories[category].count;
    insights.push(`${category}: ${categories[category].count} items, avg margin ${avgCategoryMargin.toFixed(1)}%`);
  });

  return {
    insights,
    recommendations,
    totalItems: items.length,
    avgMargin: Number(avgMargin.toFixed(2)),
  };
};

// Levenshtein distance helper
function editDistance(s1, s2) {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) {
      costs[s2.length] = lastValue;
    }
  }
  return costs[s2.length];
}

// Calculate similarity score between 0.0 and 1.0
function getSimilarity(s1, s2) {
  let longer = s1.toLowerCase();
  let shorter = s2.toLowerCase();
  if (s1.length < s2.length) {
    longer = s2.toLowerCase();
    shorter = s1.toLowerCase();
  }
  const longerLength = longer.length;
  if (longerLength === 0) {
    return 1.0;
  }
  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

// Fallback regex recipe parsing
function fallbackParseRecipe(recipeText, libraryIngredients) {
  if (!recipeText) return [];
  const lines = recipeText.split('\n');
  const parsed = [];
  
  // List of common unit keywords
  const unitKeywords = [
    'g', 'kg', 'ml', 'l', 'shots', 'shot', 'pcs', 'pc', 'piece', 'pieces', 
    'cup', 'cups', 'tbsp', 'tsp', 'oz', 'grams', 'gram', 'milliliters', 
    'milliliter', 'liters', 'liter', 'bag', 'bags', 'pack', 'packs', 'cans', 'can',
    'tb', 'ts', 'cl', 'dl'
  ];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Skip comment lines or header titles (lines ending in ':' or starting with '#')
    if (trimmed.endsWith(':') || trimmed.startsWith('#')) {
      continue;
    }
    
    // Clean bullet list markers like '-', '*', '•' at the start of the line
    let cleanLine = trimmed.replace(/^[-*•]\s*/, '').trim();
    // Clean numbered list markers like '1. ', '2) ' (must be followed by space)
    cleanLine = cleanLine.replace(/^\d+[\.)]\s+/, '').trim();
    
    // Parse quantity
    let quantity = 1;
    // Match decimal or integer numbers at the start of the line (e.g. 1.5, 200, 2)
    let qtyMatch = cleanLine.match(/^(\d+(?:\.\d+)?)\s*(.*)/);
    
    if (qtyMatch) {
      quantity = parseFloat(qtyMatch[1]);
      cleanLine = qtyMatch[2].trim();
    } else {
      // Try matching fractions like "1/2", "1/4", "3/4"
      let fracMatch = cleanLine.match(/^(\d+)\/(\d+)\s*(.*)/);
      if (fracMatch) {
        quantity = parseFloat(fracMatch[1]) / parseFloat(fracMatch[2]);
        cleanLine = fracMatch[3].trim();
      }
    }
    
    // Parse unit
    let unit = 'pc'; // default fallback
    let name = cleanLine;
    
    const words = cleanLine.split(/\s+/);
    if (words.length > 1) {
      // Clean word to match (e.g. remove trailing 's' or punctuation)
      const firstWordCleaned = words[0].toLowerCase().replace(/[^a-z]/g, '');
      if (unitKeywords.includes(firstWordCleaned)) {
        unit = words[0];
        name = words.slice(1).join(' ').trim();
      }
    }
    
    // Clean description/name (remove leading prep words)
    name = name.replace(/^(of|for|with|about)\s+/i, '').trim();

    // Auto convert tbsp / tsp to g
    const lowerUnit = unit.toLowerCase();
    if (lowerUnit === 'tsp' || lowerUnit === 'teaspoon' || lowerUnit === 'teaspoons') {
      quantity = quantity * 5;
      unit = 'g';
    } else if (lowerUnit === 'tbsp' || lowerUnit === 'tablespoon' || lowerUnit === 'tablespoons' || lowerUnit === 'tb') {
      quantity = quantity * 15;
      unit = 'g';
    }
    
    // Match against library ingredients
    let bestMatch = null;
    let bestScore = 0;
    
    for (const ing of libraryIngredients) {
      const ingNameLower = ing.name.toLowerCase();
      const nameLower = name.toLowerCase();
      
      // 1. Exact match
      if (ingNameLower === nameLower) {
        bestMatch = ing;
        bestScore = 1.0;
        break;
      }
      
      // 2. Substring match
      if (ingNameLower.includes(nameLower) || nameLower.includes(ingNameLower)) {
        const score = Math.min(ing.name.length, name.length) / Math.max(ing.name.length, name.length);
        const substringScore = 0.6 + (score * 0.35); // high base score for substring match
        if (substringScore > bestScore) {
          bestScore = substringScore;
          bestMatch = ing;
        }
      }
      
      // 3. Fuzzy similarity
      const similarity = getSimilarity(ing.name, name);
      if (similarity > bestScore) {
        bestScore = similarity;
        bestMatch = ing;
      }
    }
    
    if (bestMatch && bestScore > 0.45) {
      parsed.push({
        recipeLine: trimmed,
        matchedName: bestMatch.name,
        libraryIngredientId: bestMatch._id,
        quantity: quantity,
        unit: bestMatch.unit || unit,
        costPerUnit: bestMatch.costPerUnit,
      });
    } else {
      parsed.push({
        recipeLine: trimmed,
        matchedName: name || trimmed,
        libraryIngredientId: null,
        quantity: quantity,
        unit: unit,
        costPerUnit: 0,
      });
    }
  }
  
  return parsed;
}

// AI Recipe Parser using LLM
const parseRecipeText = async (recipeText, libraryIngredients) => {
  const HF_API_URL = 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2';
  const HF_API_KEY = process.env.HF_API_KEY;
  
  // Format library ingredients for prompt context (compact details to save tokens)
  const ingredientChoices = libraryIngredients.map(ing => ({
    id: ing._id,
    name: ing.name,
    unit: ing.unit,
    costPerUnit: ing.costPerUnit,
  }));

  const prompt = `You are a café recipe parser. Your task is to match each ingredient listed in a raw recipe text with the closest match from the Available Library Ingredients.

Available Library Ingredients:
${JSON.stringify(ingredientChoices)}

Raw Recipe Text:
"${recipeText}"

Guidelines:
1. Parse every line of the recipe that contains an ingredient.
2. For each line, extract the original line, matched library ingredient name (or original if not found), quantity (number), unit, and the library ingredient ID (or null if not found).
3. If a match is found in the Available Library Ingredients, set "libraryIngredientId" to the library ingredient's "id", "matchedName" to the library ingredient's "name", "unit" to the library ingredient's "unit", and "costPerUnit" to the library ingredient's "costPerUnit".
4. If no good match is found, set "libraryIngredientId" to null, "matchedName" to the name in the recipe text, and "costPerUnit" to 0.
5. Return ONLY a valid JSON array of objects. Do not include markdown wraps, explanation, notes, or intro text.

Output Format:
[
  {
    "recipeLine": "original line from text",
    "matchedName": "ingredient name",
    "libraryIngredientId": "id_or_null",
    "quantity": 1.5,
    "unit": "g",
    "costPerUnit": 0.05
  }
]`;

  let isAIParsed = false;
  let parsedIngredients = [];

  if (HF_API_KEY && HF_API_KEY !== 'your_huggingface_api_key_optional') {
    try {
      const response = await fetch(HF_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 800,
            temperature: 0.1,
            return_full_text: false,
          },
        }),
      });

      if (response.ok) {
        const result = await response.json();
        let aiText = '';
        if (Array.isArray(result) && result.length > 0) {
          aiText = result[0].generated_text || '';
        } else if (result.generated_text) {
          aiText = result.generated_text;
        }

        // Clean up markdown blocks if present (e.g. ```json ... ```)
        aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();

        const jsonStart = aiText.indexOf('[');
        const jsonEnd = aiText.lastIndexOf(']');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonStr = aiText.substring(jsonStart, jsonEnd + 1);
          const rawParsed = JSON.parse(jsonStr);
          isAIParsed = true;

          // Post-process AI results to ensure tbsp/tsp are converted to g
          parsedIngredients = rawParsed.map(ing => {
            let qty = Number(ing.quantity) || 1;
            let unit = (ing.unit || 'pc').toLowerCase();
            if (unit === 'tsp' || unit === 'teaspoon' || unit === 'teaspoons') {
              qty = qty * 5;
              unit = 'g';
            } else if (unit === 'tbsp' || unit === 'tablespoon' || unit === 'tablespoons' || unit === 'tb') {
              qty = qty * 15;
              unit = 'g';
            }
            return {
              ...ing,
              quantity: qty,
              unit: unit
            };
          });
        }
      }
    } catch (error) {
      console.error('Hugging Face AI recipe parsing error, falling back:', error.message);
    }
  }

  // Fallback if AI was skipped or failed
  if (!isAIParsed) {
    parsedIngredients = fallbackParseRecipe(recipeText, libraryIngredients);
  }

  return parsedIngredients;
};

module.exports = {
  getAISuggestion,
  getPricingInsights,
  parseRecipeText,
};

