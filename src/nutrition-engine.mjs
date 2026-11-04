// Backend Public Nutrition Dataset API Engine:
// Supports Edamam (Nutrition Analysis + Food Database v2), Nutritionix (Track v2 Natural + Instant),
// USDA FoodData Central v1 (active out-of-the-box via DEMO_KEY or USDA_API_KEY), and OpenFoodFacts,
// backed by persistent disk caching and curated IFCT/USDA regional dish profiles.
// Self-contained under api/ so `docker compose build api` works with `./api` build context.
import fs from 'node:fs';
import path from 'node:path';

const r1 = n => Math.round((Number(n) || 0) * 10) / 10;
const r0 = n => Math.round(Number(n) || 0);

const NUTRIENT_KEYS = [
  'proteinG', 'carbsG', 'fatG', 'fiberG', 'sugarG', 'satFatG',
  'sodiumMg', 'potassiumMg', 'calciumMg', 'ironMg', 'magnesiumMg', 'zincMg',
  'vitAMcg', 'vitCMg', 'vitDMcg', 'vitB12Mcg', 'cholesterolMg',
];

// Authentic IFCT Indian/South Asian dishes where regional spice/ghee/lentil preparation
// outperforms generic Western database entries on exact/alias matches.
const REGIONAL_SPECIALTY_IDS = new Set([
  'dosa', 'masala-dosa', 'idli', 'medu-vada', 'sambar', 'coconut-chutney',
  'upma', 'pongal', 'poha', 'fish-curry', 'chicken-curry', 'mutton-curry',
  'egg-curry', 'dal', 'rajma', 'chole', 'roti', 'parotta', 'naan',
  'chicken-biryani', 'veg-biryani', 'curd-rice', 'paneer-curry', 'curd',
  'soya-chunks', 'chai', 'buttermilk', 'coconut-water',
]);

function item(id, name, aliases, category, unitLabel, servingG, kcal, m) {
  return {
    id,
    name,
    aliases,
    category,
    unitLabel,
    servingG,
    kcal,
    source: 'curated',
    nutrients: {
      proteinG: r1(m.p),
      carbsG: r1(m.c),
      fatG: r1(m.f),
      fiberG: r1(m.fib),
      sugarG: r1(m.sug),
      satFatG: r1(m.sf),
      sodiumMg: r0(m.na),
      potassiumMg: r0(m.k),
      calciumMg: r0(m.ca),
      ironMg: r1(m.fe),
      magnesiumMg: r0(m.mg),
      zincMg: r1(m.zn),
      vitAMcg: r0(m.va),
      vitCMg: r1(m.vc),
      vitDMcg: r1(m.vd),
      vitB12Mcg: r1(m.vb12),
      cholesterolMg: r0(m.chol),
    },
  };
}

export const CURATED_FOODS = [
  item('dosa', 'Plain Dosa', ['doasa', 'dosai', 'kal dosa', 'dosa'], 'Breakfast', 'piece', 80, 133,
    { p: 3.6, c: 23.2, f: 2.9, fib: 1.4, sug: 0.5, sf: 0.7, na: 190, k: 95, ca: 18, fe: 1.1, mg: 24, zn: 0.5, va: 8, vc: 0.4, vd: 0, vb12: 0, chol: 0 }),
  item('masala-dosa', 'Masala Dosa', ['masala doasa', 'potato dosa', 'ghee roast dosa'], 'Breakfast', 'piece', 160, 285,
    { p: 5.8, c: 42.0, f: 10.2, fib: 3.4, sug: 1.8, sf: 3.8, na: 420, k: 310, ca: 34, fe: 1.9, mg: 42, zn: 0.8, va: 45, vc: 9.5, vd: 0, vb12: 0.1, chol: 8 }),
  item('idli', 'Idli', ['idly', 'steamed idli', 'rice idli'], 'Breakfast', 'piece', 45, 58,
    { p: 2.0, c: 12.1, f: 0.2, fib: 0.8, sug: 0.2, sf: 0.05, na: 95, k: 48, ca: 10, fe: 0.5, mg: 14, zn: 0.3, va: 2, vc: 0, vd: 0, vb12: 0.05, chol: 0 }),
  item('medu-vada', 'Medu Vada', ['vada', 'urad vada', 'ulundu vadai', 'vadai'], 'Breakfast', 'piece', 55, 148,
    { p: 4.5, c: 15.2, f: 7.8, fib: 2.2, sug: 0.6, sf: 1.4, na: 180, k: 145, ca: 22, fe: 1.2, mg: 30, zn: 0.6, va: 4, vc: 1.2, vd: 0, vb12: 0, chol: 0 }),
  item('sambar', 'Sambar', ['sambhar', 'lentil sambar', 'vegetable sambar'], 'Lunch', 'bowl', 180, 125,
    { p: 5.8, c: 18.4, f: 3.2, fib: 4.6, sug: 3.8, sf: 0.6, na: 390, k: 360, ca: 46, fe: 1.8, mg: 44, zn: 0.8, va: 95, vc: 14.0, vd: 0, vb12: 0, chol: 0 }),
  item('coconut-chutney', 'Coconut Chutney', ['chutney', 'thengai chutney'], 'Breakfast', 'serving', 40, 96,
    { p: 1.4, c: 4.1, f: 8.6, fib: 2.1, sug: 1.2, sf: 6.8, na: 135, k: 110, ca: 9, fe: 0.7, mg: 15, zn: 0.3, va: 5, vc: 2.0, vd: 0, vb12: 0, chol: 0 }),
  item('upma', 'Rava Upma', ['upma', 'sooji upma', 'uppuma'], 'Breakfast', 'bowl', 180, 235,
    { p: 5.9, c: 37.5, f: 6.8, fib: 2.6, sug: 1.9, sf: 1.3, na: 340, k: 150, ca: 24, fe: 1.6, mg: 32, zn: 0.7, va: 38, vc: 5.0, vd: 0, vb12: 0, chol: 0 }),
  item('pongal', 'Ven Pongal', ['pongal', 'khara pongal'], 'Breakfast', 'bowl', 200, 290,
    { p: 7.4, c: 41.0, f: 10.6, fib: 2.4, sug: 0.8, sf: 5.8, na: 360, k: 195, ca: 28, fe: 1.5, mg: 40, zn: 0.9, va: 75, vc: 1.0, vd: 0.1, vb12: 0.1, chol: 22 }),
  item('poha', 'Kanda Poha', ['poha', 'flattened rice', 'aval upma'], 'Breakfast', 'bowl', 170, 240,
    { p: 4.8, c: 41.2, f: 6.4, fib: 2.9, sug: 2.4, sf: 0.9, na: 310, k: 185, ca: 22, fe: 3.8, mg: 34, zn: 0.6, va: 32, vc: 8.5, vd: 0, vb12: 0, chol: 0 }),
  item('cooked-rice', 'Cooked White Rice', ['rice', 'white rice', 'steamed rice', 'boiled rice', 'plain rice', 'chawal', 'sadham'], 'Lunch', 'bowl', 180, 234,
    { p: 4.4, c: 50.8, f: 0.5, fib: 0.7, sug: 0.1, sf: 0.1, na: 12, k: 62, ca: 18, fe: 0.4, mg: 22, zn: 0.8, va: 0, vc: 0, vd: 0, vb12: 0, chol: 0 }),
  item('brown-rice', 'Cooked Brown Rice', ['brown rice', 'red rice', 'matta rice'], 'Lunch', 'bowl', 185, 218,
    { p: 5.0, c: 45.8, f: 1.8, fib: 3.5, sug: 0.4, sf: 0.4, na: 10, k: 154, ca: 20, fe: 1.0, mg: 84, zn: 1.2, va: 0, vc: 0, vd: 0, vb12: 0, chol: 0 }),
  item('fish-curry', 'Fish Curry', ['meen kuzhambu', 'fish masala', 'meen curry', 'fish gravy', 'kerala fish curry'], 'Lunch', 'bowl', 180, 245,
    { p: 22.8, c: 7.4, f: 13.8, fib: 1.8, sug: 2.6, sf: 4.6, na: 520, k: 490, ca: 58, fe: 1.9, mg: 48, zn: 1.1, va: 85, vc: 9.0, vd: 6.4, vb12: 3.6, chol: 68 }),
  item('chicken-curry', 'Chicken Curry', ['murgh curry', 'kozhi kuzhambu', 'chicken masala', 'chicken gravy'], 'Dinner', 'bowl', 200, 295,
    { p: 26.5, c: 8.8, f: 17.2, fib: 2.0, sug: 3.1, sf: 4.4, na: 560, k: 440, ca: 42, fe: 2.1, mg: 44, zn: 2.0, va: 92, vc: 8.4, vd: 0.2, vb12: 0.6, chol: 88 }),
  item('mutton-curry', 'Mutton Curry', ['lamb curry', 'goat curry', 'mutton masala'], 'Dinner', 'bowl', 200, 345,
    { p: 25.4, c: 7.6, f: 23.8, fib: 1.6, sug: 2.4, sf: 8.9, na: 580, k: 430, ca: 36, fe: 3.4, mg: 40, zn: 4.6, va: 65, vc: 6.5, vd: 0.2, vb12: 2.8, chol: 96 }),
  item('egg-curry', 'Egg Curry', ['anda curry', 'muttai kuzhambu', 'egg masala'], 'Dinner', 'bowl', 200, 260,
    { p: 14.2, c: 9.2, f: 18.4, fib: 1.9, sug: 3.4, sf: 4.6, na: 490, k: 310, ca: 68, fe: 2.4, mg: 30, zn: 1.5, va: 190, vc: 8.0, vd: 2.2, vb12: 1.2, chol: 372 }),
  item('dal', 'Dal Tadka', ['dal', 'daal', 'lentil soup', 'toor dal', 'moong dal', 'masoor dal', 'paruppu'], 'Lunch', 'bowl', 180, 198,
    { p: 10.6, c: 26.4, f: 5.8, fib: 6.8, sug: 2.2, sf: 1.8, na: 380, k: 460, ca: 42, fe: 2.9, mg: 56, zn: 1.4, va: 58, vc: 6.2, vd: 0, vb12: 0, chol: 6 }),
  item('rajma', 'Rajma Masala', ['rajma', 'kidney bean curry'], 'Lunch', 'bowl', 200, 245,
    { p: 11.8, c: 34.6, f: 6.8, fib: 9.2, sug: 3.1, sf: 1.2, na: 440, k: 580, ca: 64, fe: 3.6, mg: 68, zn: 1.5, va: 62, vc: 7.8, vd: 0, vb12: 0, chol: 0 }),
  item('chole', 'Chole Masala', ['chole', 'chana masala', 'chickpea curry', 'sundal'], 'Lunch', 'bowl', 200, 268,
    { p: 11.4, c: 36.2, f: 8.6, fib: 8.8, sug: 4.2, sf: 1.3, na: 470, k: 495, ca: 72, fe: 3.8, mg: 66, zn: 1.7, va: 54, vc: 8.4, vd: 0, vb12: 0, chol: 0 }),
  item('roti', 'Whole Wheat Roti', ['roti', 'chapati', 'chapathi', 'phulka'], 'Dinner', 'piece', 40, 106,
    { p: 3.5, c: 20.4, f: 1.2, fib: 3.1, sug: 0.6, sf: 0.3, na: 95, k: 115, ca: 15, fe: 1.3, mg: 38, zn: 0.8, va: 2, vc: 0, vd: 0, vb12: 0, chol: 0 }),
  item('parotta', 'Parotta / Paratha', ['parotta', 'paratha', 'kerala parotta', 'aloo paratha'], 'Dinner', 'piece', 85, 260,
    { p: 5.6, c: 36.8, f: 9.8, fib: 2.4, sug: 1.4, sf: 3.6, na: 290, k: 130, ca: 22, fe: 1.6, mg: 28, zn: 0.7, va: 30, vc: 1.5, vd: 0, vb12: 0, chol: 8 }),
  item('naan', 'Tandoori Naan', ['naan', 'butter naan', 'garlic naan'], 'Dinner', 'piece', 90, 275,
    { p: 7.8, c: 45.2, f: 6.8, fib: 2.1, sug: 2.8, sf: 2.8, na: 380, k: 120, ca: 58, fe: 2.2, mg: 24, zn: 0.8, va: 35, vc: 0.5, vd: 0, vb12: 0.1, chol: 14 }),
  item('chicken-biryani', 'Chicken Biryani', ['biryani', 'dum biryani', 'mutton biryani', 'hyderabadi biryani'], 'Lunch', 'plate', 300, 490,
    { p: 24.5, c: 56.0, f: 18.2, fib: 3.4, sug: 3.2, sf: 5.4, na: 690, k: 480, ca: 62, fe: 2.6, mg: 58, zn: 2.4, va: 88, vc: 6.5, vd: 0.3, vb12: 0.6, chol: 78 }),
  item('veg-biryani', 'Vegetable Biryani', ['veg biryani', 'pulao', 'veg pulao'], 'Lunch', 'plate', 260, 355,
    { p: 7.6, c: 54.8, f: 11.4, fib: 4.8, sug: 4.1, sf: 3.2, na: 540, k: 370, ca: 52, fe: 2.1, mg: 50, zn: 1.3, va: 145, vc: 11.0, vd: 0, vb12: 0, chol: 10 }),
  item('curd-rice', 'Curd Rice', ['thayir sadham', 'dahi chawal'], 'Lunch', 'bowl', 220, 255,
    { p: 7.2, c: 40.5, f: 6.8, fib: 0.9, sug: 4.8, sf: 3.6, na: 260, k: 245, ca: 165, fe: 0.6, mg: 32, zn: 1.1, va: 42, vc: 1.5, vd: 0.1, vb12: 0.5, chol: 16 }),
  item('paneer-curry', 'Paneer Dish', ['paneer', 'palak paneer', 'paneer butter masala', 'paneer tikka'], 'Dinner', 'bowl', 180, 320,
    { p: 16.8, c: 10.4, f: 23.6, fib: 2.4, sug: 3.8, sf: 13.8, na: 480, k: 320, ca: 420, fe: 2.2, mg: 42, zn: 2.1, va: 240, vc: 14.0, vd: 0, vb12: 0.8, chol: 58 }),
  item('curd', 'Plain Curd / Yogurt', ['curd', 'dahi', 'yogurt', 'plain yogurt'], 'Lunch', 'bowl', 150, 98,
    { p: 5.4, c: 7.2, f: 5.0, fib: 0, sug: 7.0, sf: 3.2, na: 70, k: 235, ca: 185, fe: 0.2, mg: 18, zn: 0.9, va: 42, vc: 1.2, vd: 0.1, vb12: 0.6, chol: 19 }),
  item('boiled-egg', 'Boiled Egg', ['egg', 'eggs', 'whole egg', 'hard boiled egg', 'fried egg', 'poached egg'], 'Protein', 'piece', 50, 78,
    { p: 6.3, c: 0.6, f: 5.3, fib: 0, sug: 0.5, sf: 1.6, na: 62, k: 63, ca: 25, fe: 0.9, mg: 5, zn: 0.6, va: 75, vc: 0, vd: 1.1, vb12: 0.6, chol: 186 }),
  item('egg-white', 'Egg White', ['egg whites', 'boiled egg white'], 'Protein', 'piece', 33, 17,
    { p: 3.6, c: 0.2, f: 0.1, fib: 0, sug: 0.2, sf: 0, na: 55, k: 54, ca: 2, fe: 0.03, mg: 4, zn: 0.01, va: 0, vc: 0, vd: 0, vb12: 0.03, chol: 0 }),
  item('omelette', 'Two-Egg Omelette', ['omelette', 'omelet', 'scrambled eggs', 'masala omelette'], 'Breakfast', 'serving', 120, 196,
    { p: 13.2, c: 2.1, f: 14.8, fib: 0.4, sug: 1.1, sf: 4.1, na: 280, k: 165, ca: 58, fe: 1.9, mg: 14, zn: 1.3, va: 165, vc: 3.5, vd: 2.2, vb12: 1.1, chol: 372 }),
  item('chicken-breast', 'Grilled Chicken Breast', ['chicken breast', 'grilled chicken', 'boiled chicken', 'roasted chicken'], 'Protein', '100g', 100, 165,
    { p: 31.0, c: 0, f: 3.6, fib: 0, sug: 0, sf: 1.0, na: 74, k: 256, ca: 15, fe: 1.0, mg: 29, zn: 1.0, va: 6, vc: 0, vd: 0.1, vb12: 0.3, chol: 85 }),
  item('grilled-fish', 'Pan-Seared Fish Fillet', ['fried fish', 'fish fry', 'grilled fish', 'fish', 'tilapia', 'seer fish', 'vanjaram'], 'Protein', 'piece', 120, 215,
    { p: 26.4, c: 2.2, f: 10.8, fib: 0.2, sug: 0.2, sf: 2.4, na: 310, k: 420, ca: 28, fe: 1.1, mg: 38, zn: 0.8, va: 32, vc: 1.5, vd: 5.8, vb12: 2.9, chol: 66 }),
  item('salmon', 'Salmon Fillet', ['salmon', 'baked salmon', 'grilled salmon'], 'Protein', '100g', 100, 208,
    { p: 20.4, c: 0, f: 13.4, fib: 0, sug: 0, sf: 3.1, na: 59, k: 363, ca: 9, fe: 0.3, mg: 27, zn: 0.4, va: 12, vc: 0, vd: 11.0, vb12: 3.2, chol: 55 }),
  item('tuna', 'Canned Tuna', ['tuna', 'tuna salad'], 'Protein', '100g', 100, 132,
    { p: 28.2, c: 0, f: 1.3, fib: 0, sug: 0, sf: 0.4, na: 247, k: 237, ca: 11, fe: 1.3, mg: 30, zn: 0.8, va: 18, vc: 0, vd: 1.9, vb12: 2.5, chol: 42 }),
  item('prawns', 'Prawns / Shrimp', ['prawns', 'shrimp', 'prawn masala'], 'Protein', '100g', 100, 119,
    { p: 22.8, c: 1.5, f: 2.1, fib: 0, sug: 0, sf: 0.5, na: 340, k: 220, ca: 68, fe: 0.6, mg: 36, zn: 1.6, va: 54, vc: 1.0, vd: 0.4, vb12: 1.7, chol: 189 }),
  item('lean-beef', 'Lean Beef Steak', ['beef', 'steak', 'ground beef', 'beef roast'], 'Protein', '100g', 100, 250,
    { p: 26.1, c: 0, f: 15.4, fib: 0, sug: 0, sf: 6.1, na: 72, k: 318, ca: 18, fe: 2.6, mg: 21, zn: 6.3, va: 2, vc: 0, vd: 0.1, vb12: 2.6, chol: 88 }),
  item('tofu', 'Firm Tofu', ['tofu', 'soy paneer'], 'Protein', '100g', 100, 144,
    { p: 15.8, c: 2.8, f: 8.7, fib: 2.3, sug: 0.6, sf: 1.3, na: 14, k: 237, ca: 683, fe: 2.7, mg: 58, zn: 1.6, va: 5, vc: 0.2, vd: 0, vb12: 0, chol: 0 }),
  item('soya-chunks', 'Cooked Soya Chunks', ['soya chunks', 'meal maker', 'soy chunks'], 'Protein', 'bowl', 100, 172,
    { p: 26.0, c: 16.5, f: 0.6, fib: 6.5, sug: 1.2, sf: 0.1, na: 18, k: 620, ca: 175, fe: 4.2, mg: 110, zn: 2.2, va: 0, vc: 0, vd: 0, vb12: 0, chol: 0 }),
  item('whey-protein', 'Whey Protein Shake', ['whey', 'whey protein', 'protein shake', 'protein scoop', 'protein powder'], 'Protein', 'serving', 32, 124,
    { p: 24.5, c: 3.1, f: 1.5, fib: 0.2, sug: 1.6, sf: 0.9, na: 95, k: 165, ca: 130, fe: 0.4, mg: 22, zn: 0.6, va: 10, vc: 0, vd: 0, vb12: 0.8, chol: 35 }),
  item('greek-yogurt', 'Greek Yogurt', ['hung curd', 'skyr', 'high protein yogurt'], 'Protein', 'cup', 170, 100,
    { p: 17.3, c: 6.1, f: 0.7, fib: 0, sug: 5.5, sf: 0.2, na: 61, k: 240, ca: 187, fe: 0.1, mg: 19, zn: 0.9, va: 4, vc: 0, vd: 0, vb12: 1.3, chol: 9 }),
  item('oats', 'Cooked Oatmeal / Oats', ['oats', 'oatmeal', 'rolled oats', 'masala oats', 'porridge'], 'Breakfast', 'bowl', 234, 166,
    { p: 5.9, c: 28.1, f: 3.6, fib: 4.0, sug: 0.6, sf: 0.6, na: 9, k: 164, ca: 21, fe: 2.1, mg: 63, zn: 2.3, va: 0, vc: 0, vd: 0, vb12: 0, chol: 0 }),
  item('bread', 'Whole Wheat Bread', ['bread', 'toast', 'bread slice', 'brown bread', 'white bread'], 'Breakfast', 'slice', 32, 81,
    { p: 4.0, c: 13.8, f: 1.1, fib: 2.0, sug: 1.4, sf: 0.2, na: 144, k: 81, ca: 33, fe: 0.8, mg: 24, zn: 0.5, va: 0, vc: 0, vd: 0, vb12: 0, chol: 0 }),
  item('peanut-butter', 'Peanut Butter', ['almond butter', 'nut butter'], 'Breakfast', 'serving', 32, 188,
    { p: 7.7, c: 6.9, f: 16.1, fib: 1.9, sug: 2.9, sf: 3.3, na: 136, k: 189, ca: 16, fe: 0.6, mg: 54, zn: 0.8, va: 0, vc: 0, vd: 0, vb12: 0, chol: 0 }),
  item('milk', 'Whole Milk', ['milk', 'cow milk', 'glass of milk', 'toned milk'], 'Drinks', 'cup', 240, 149,
    { p: 7.7, c: 11.7, f: 7.9, fib: 0, sug: 12.3, sf: 4.6, na: 105, k: 322, ca: 276, fe: 0.1, mg: 24, zn: 0.9, va: 112, vc: 0, vd: 2.9, vb12: 1.1, chol: 24 }),
  item('cheese', 'Cheddar Cheese', ['cheese', 'cheese slice', 'mozzarella'], 'Snacks', 'slice', 28, 113,
    { p: 6.4, c: 0.9, f: 9.3, fib: 0, sug: 0.1, sf: 5.3, na: 183, k: 21, ca: 199, fe: 0.1, mg: 8, zn: 1.0, va: 75, vc: 0, vd: 0.2, vb12: 0.3, chol: 28 }),
  item('banana', 'Banana', ['bananas', 'ripe banana', 'elachi banana', 'nendran banana'], 'Snacks', 'piece', 118, 105,
    { p: 1.3, c: 27.0, f: 0.4, fib: 3.1, sug: 14.4, sf: 0.1, na: 1, k: 422, ca: 6, fe: 0.3, mg: 32, zn: 0.2, va: 4, vc: 10.3, vd: 0, vb12: 0, chol: 0 }),
  item('apple', 'Apple', ['apples', 'green apple', 'red apple'], 'Snacks', 'piece', 182, 95,
    { p: 0.5, c: 25.1, f: 0.3, fib: 4.4, sug: 18.9, sf: 0.1, na: 2, k: 195, ca: 11, fe: 0.2, mg: 9, zn: 0.1, va: 5, vc: 8.4, vd: 0, vb12: 0, chol: 0 }),
  item('orange', 'Orange', ['oranges', 'sweet lime', 'mosambi', 'mandarin'], 'Snacks', 'piece', 131, 62,
    { p: 1.2, c: 15.4, f: 0.2, fib: 3.1, sug: 12.2, sf: 0, na: 0, k: 237, ca: 52, fe: 0.1, mg: 13, zn: 0.1, va: 14, vc: 69.7, vd: 0, vb12: 0, chol: 0 }),
  item('mango', 'Mango', ['mangoes', 'alphonso mango'], 'Snacks', 'cup', 165, 99,
    { p: 1.4, c: 24.7, f: 0.6, fib: 2.6, sug: 22.5, sf: 0.2, na: 2, k: 277, ca: 18, fe: 0.3, mg: 16, zn: 0.1, va: 89, vc: 60.1, vd: 0, vb12: 0, chol: 0 }),
  item('papaya', 'Papaya', ['ripe papaya'], 'Snacks', 'cup', 145, 62,
    { p: 0.7, c: 15.7, f: 0.4, fib: 2.5, sug: 11.3, sf: 0.1, na: 11, k: 264, ca: 29, fe: 0.4, mg: 30, zn: 0.1, va: 68, vc: 88.3, vd: 0, vb12: 0, chol: 0 }),
  item('avocado', 'Avocado', ['half avocado'], 'Snacks', 'piece', 150, 240,
    { p: 3.0, c: 12.8, f: 22.0, fib: 10.0, sug: 1.0, sf: 3.2, na: 11, k: 728, ca: 18, fe: 0.8, mg: 44, zn: 1.0, va: 11, vc: 15.0, vd: 0, vb12: 0, chol: 0 }),
  item('almonds', 'Almonds', ['badam', 'roasted almonds'], 'Snacks', 'serving', 28, 164,
    { p: 6.0, c: 6.1, f: 14.2, fib: 3.5, sug: 1.2, sf: 1.1, na: 1, k: 208, ca: 76, fe: 1.1, mg: 77, zn: 0.9, va: 0, vc: 0, vd: 0, vb12: 0, chol: 0 }),
  item('walnuts', 'Walnuts', ['akhrot'], 'Snacks', 'serving', 28, 185,
    { p: 4.3, c: 3.9, f: 18.5, fib: 1.9, sug: 0.7, sf: 1.7, na: 1, k: 125, ca: 28, fe: 0.8, mg: 45, zn: 0.9, va: 1, vc: 0.4, vd: 0, vb12: 0, chol: 0 }),
  item('peanuts', 'Roasted Peanuts', ['peanuts', 'groundnuts', 'verkadalai'], 'Snacks', 'serving', 28, 161,
    { p: 7.3, c: 4.6, f: 14.0, fib: 2.4, sug: 1.3, sf: 1.9, na: 5, k: 200, ca: 26, fe: 1.3, mg: 48, zn: 0.9, va: 0, vc: 0, vd: 0, vb12: 0, chol: 0 }),
  item('broccoli', 'Steamed Broccoli', ['broccoli'], 'Dinner', 'cup', 156, 55,
    { p: 3.7, c: 11.2, f: 0.6, fib: 5.1, sug: 2.2, sf: 0.1, na: 64, k: 457, ca: 62, fe: 1.0, mg: 33, zn: 0.7, va: 120, vc: 101.2, vd: 0, vb12: 0, chol: 0 }),
  item('spinach', 'Cooked Spinach', ['spinach', 'palak', 'keerai', 'greens'], 'Lunch', 'cup', 180, 41,
    { p: 5.3, c: 6.8, f: 0.5, fib: 4.3, sug: 0.8, sf: 0.1, na: 126, k: 839, ca: 245, fe: 6.4, mg: 157, zn: 1.4, va: 943, vc: 17.6, vd: 0, vb12: 0, chol: 0 }),
  item('salad', 'Mixed Vegetable Salad', ['salad', 'green salad', 'cucumber salad', 'kachumber'], 'Lunch', 'bowl', 160, 48,
    { p: 1.8, c: 9.4, f: 0.6, fib: 3.2, sug: 4.6, sf: 0.1, na: 45, k: 340, ca: 38, fe: 1.1, mg: 24, zn: 0.4, va: 185, vc: 28.0, vd: 0, vb12: 0, chol: 0 }),
  item('sweet-potato', 'Baked Sweet Potato', ['sweet potato', 'shakarkandi'], 'Snacks', 'piece', 130, 117,
    { p: 2.6, c: 27.0, f: 0.2, fib: 4.3, sug: 8.4, sf: 0, na: 47, k: 618, ca: 49, fe: 0.9, mg: 35, zn: 0.4, va: 1249, vc: 25.5, vd: 0, vb12: 0, chol: 0 }),
  item('potato', 'Boiled Potato', ['potato', 'aloo', 'potato sabzi', 'aloo fry'], 'Lunch', 'piece', 150, 130,
    { p: 2.8, c: 30.1, f: 0.2, fib: 2.7, sug: 1.3, sf: 0, na: 8, k: 568, ca: 12, fe: 0.5, mg: 33, zn: 0.5, va: 0, vc: 19.5, vd: 0, vb12: 0, chol: 0 }),
  item('pasta', 'Cooked Pasta with Sauce', ['pasta', 'spaghetti', 'macaroni', 'penne'], 'Dinner', 'bowl', 220, 330,
    { p: 11.4, c: 58.2, f: 5.8, fib: 4.2, sug: 6.4, sf: 1.2, na: 460, k: 390, ca: 42, fe: 2.4, mg: 46, zn: 1.3, va: 68, vc: 12.0, vd: 0, vb12: 0, chol: 0 }),
  item('noodles', 'Stir-Fried Noodles', ['noodles', 'hakka noodles', 'maggi', 'ramen'], 'Dinner', 'bowl', 220, 365,
    { p: 9.2, c: 54.0, f: 12.4, fib: 3.1, sug: 3.0, sf: 4.2, na: 780, k: 195, ca: 28, fe: 2.6, mg: 32, zn: 1.0, va: 45, vc: 6.0, vd: 0, vb12: 0, chol: 12 }),
  item('sandwich', 'Chicken / Veg Sandwich', ['sandwich', 'grilled sandwich', 'club sandwich'], 'Lunch', 'piece', 180, 340,
    { p: 18.6, c: 36.4, f: 13.2, fib: 3.8, sug: 4.2, sf: 4.1, na: 610, k: 290, ca: 120, fe: 2.2, mg: 40, zn: 1.5, va: 72, vc: 8.5, vd: 0.3, vb12: 0.5, chol: 48 }),
  item('burger', 'Burger', ['chicken burger', 'veg burger', 'cheeseburger'], 'Dinner', 'piece', 200, 485,
    { p: 24.0, c: 42.0, f: 24.2, fib: 2.6, sug: 6.8, sf: 8.6, na: 790, k: 340, ca: 145, fe: 3.4, mg: 38, zn: 3.8, va: 64, vc: 4.0, vd: 0.4, vb12: 1.8, chol: 72 }),
  item('pizza', 'Cheese Pizza Slice', ['pizza', 'pizza slice', 'margherita pizza'], 'Dinner', 'slice', 107, 285,
    { p: 12.2, c: 35.6, f: 10.4, fib: 2.5, sug: 3.8, sf: 4.8, na: 640, k: 184, ca: 201, fe: 2.7, mg: 26, zn: 1.4, va: 74, vc: 1.5, vd: 0, vb12: 0.4, chol: 18 }),
  item('chai', 'Masala Chai / Milk Tea', ['chai', 'tea', 'milk tea', 'masala tea', 'filter coffee', 'coffee with milk'], 'Drinks', 'cup', 180, 95,
    { p: 3.1, c: 12.8, f: 3.4, fib: 0, sug: 11.2, sf: 2.1, na: 48, k: 155, ca: 115, fe: 0.2, mg: 14, zn: 0.4, va: 44, vc: 0, vd: 1.1, vb12: 0.4, chol: 11 }),
  item('buttermilk', 'Spiced Buttermilk', ['buttermilk', 'chaas', 'neer mor', 'lassi'], 'Drinks', 'cup', 220, 62,
    { p: 3.4, c: 5.2, f: 2.8, fib: 0.2, sug: 4.6, sf: 1.7, na: 220, k: 185, ca: 125, fe: 0.3, mg: 16, zn: 0.6, va: 24, vc: 1.8, vd: 0.1, vb12: 0.4, chol: 10 }),
  item('coconut-water', 'Tender Coconut Water', ['coconut water', 'elaneer', 'nariyal pani'], 'Drinks', 'cup', 240, 46,
    { p: 1.7, c: 8.9, f: 0.5, fib: 2.6, sug: 6.3, sf: 0.4, na: 252, k: 600, ca: 58, fe: 0.7, mg: 60, zn: 0.2, va: 0, vc: 5.8, vd: 0, vb12: 0, chol: 0 }),
];

const WORD_NUMS = {
  half: 0.5, a: 1, an: 1, one: 1, two: 2, three: 3, four: 4,
  five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, couple: 2,
};

const CACHE_TTL_MS = 7 * 86400000;
const HTTP_TIMEOUT_MS = 3200;

const cleanToken = s =>
  String(s || '').toLowerCase().replace(/[^a-z0-9.\s]/g, ' ').replace(/\s+/g, ' ').trim();

const isOffline = () => /^(1|true|yes)$/i.test(process.env.NUTRITION_OFFLINE || '');
const hasEdamam = () => Boolean(process.env.EDAMAM_APP_ID && process.env.EDAMAM_APP_KEY);
const hasNutritionix = () => Boolean(process.env.NUTRITIONIX_APP_ID && process.env.NUTRITIONIX_API_KEY);
const usdaApiKey = () => String(process.env.USDA_API_KEY || 'DEMO_KEY').trim() || 'DEMO_KEY';

export function activeNutritionProviders() {
  if (isOffline()) return ['curated'];
  const list = [];
  if (hasEdamam()) list.push('edamam');
  if (hasNutritionix()) list.push('nutritionix');
  list.push('usda', 'openfoodfacts', 'curated');
  return list;
}

function editDistanceAtMostOne(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1 || a.length < 4 || b.length < 4) return false;
  let i = 0, j = 0, diffs = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    diffs++;
    if (diffs > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return diffs + (a.length - i) + (b.length - j) <= 1;
}

function scoreFood(food, q) {
  const query = cleanToken(q);
  if (!query) return 0;
  const names = [food.name, ...(food.aliases || [])].map(cleanToken);
  let best = 0;
  for (const cand of names) {
    if (!cand) continue;
    if (cand === query) return 100;
    if (cand.startsWith(query)) best = Math.max(best, 85);
    else if (query.startsWith(cand) && cand.length >= 3) best = Math.max(best, 78);
    else if (cand.includes(query)) best = Math.max(best, 70);
    else if (query.includes(cand) && cand.length >= 3) best = Math.max(best, 66);
    else {
      const qWords = query.split(' ');
      const cWords = cand.split(' ');
      const overlap = qWords.filter(qw =>
        cWords.some(cw => cw === qw || editDistanceAtMostOne(cw, qw) || editDistanceAtMostOne(qw.replace(/s$/, ''), cw.replace(/s$/, '')))
      ).length;
      if (overlap > 0) {
        best = Math.max(best, 45 + Math.round((overlap / Math.max(qWords.length, cWords.length)) * 35));
      }
    }
  }
  return best;
}

function scaleNutrients(nutrients, factor = 1) {
  const mult = Number.isFinite(Number(factor)) && Number(factor) >= 0 ? Number(factor) : 0;
  const out = {};
  for (const key of NUTRIENT_KEYS) {
    const v = (Number(nutrients?.[key]) || 0) * mult;
    out[key] = (key.endsWith('Mg') && !['ironMg', 'zincMg', 'vitCMg'].includes(key)) || key === 'vitAMcg'
      ? Math.round(v)
      : r1(v);
  }
  return out;
}

function sumNutrients(list = []) {
  const out = {};
  for (const key of NUTRIENT_KEYS) out[key] = 0;
  for (const p of list) {
    if (!p) continue;
    for (const key of NUTRIENT_KEYS) out[key] += Number(p[key]) || 0;
  }
  return scaleNutrients(out, 1);
}

// Persistent disk cache for Edamam / Nutritionix / USDA FoodData Central / OpenFoodFacts responses
function loadCache(dataDir) {
  try {
    const file = path.join(dataDir, 'nutrition-cache.json');
    if (!fs.existsSync(file)) return {};
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveCache(dataDir, cache) {
  try {
    const keys = Object.keys(cache);
    if (keys.length > 500) {
      for (const k of keys.slice(0, keys.length - 500)) delete cache[k];
    }
    fs.writeFileSync(path.join(dataDir, 'nutrition-cache.json'), JSON.stringify(cache));
  } catch {
    // Non-fatal cache write failure
  }
}

function readCached(dataDir, cacheKey) {
  const cache = loadCache(dataDir);
  const hit = cache[cacheKey];
  if (hit && Date.now() - (hit.at || 0) < CACHE_TTL_MS && hit.value !== undefined) {
    return hit.value;
  }
  return null;
}

function writeCached(dataDir, cacheKey, value) {
  const cache = loadCache(dataDir);
  cache[cacheKey] = { at: Date.now(), value };
  saveCache(dataDir, cache);
}

async function fetchJsonWithTimeout(url, init = {}, timeoutMs = HTTP_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'openGym-Nutrition/1.0',
        ...(init.headers || {}),
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------- 1. Edamam Nutrition Analysis & Food Database v2 ---------------- */

function mapEdamamNutrients(tn = {}, factor = 1) {
  const q = code => (Number(tn?.[code]?.quantity) || 0) * factor;
  return scaleNutrients({
    proteinG: q('PROCNT'),
    carbsG: q('CHOCDF'),
    fatG: q('FAT'),
    fiberG: q('FIBTG'),
    sugarG: q('SUGAR'),
    satFatG: q('FASAT'),
    sodiumMg: q('NA'),
    potassiumMg: q('K'),
    calciumMg: q('CA'),
    ironMg: q('FE'),
    magnesiumMg: q('MG'),
    zincMg: q('ZN'),
    vitAMcg: q('VITA_RAE'),
    vitCMg: q('VITC'),
    vitDMcg: q('VITD'),
    vitB12Mcg: q('VITB12'),
    cholesterolMg: q('CHOLE'),
  }, 1);
}

async function fetchEdamamAnalyze(query, dataDir) {
  if (isOffline() || !hasEdamam()) return null;
  const key = `edamam:analyze:${cleanToken(query)}`;
  const cached = readCached(dataDir, key);
  if (cached) return cached;

  const base = (process.env.EDAMAM_API_BASE || 'https://api.edamam.com').replace(/\/$/, '');
  const url = `${base}/api/nutrition-data?app_id=${encodeURIComponent(process.env.EDAMAM_APP_ID)}&app_key=${encodeURIComponent(process.env.EDAMAM_APP_KEY)}&nutrition-type=logging&ingr=${encodeURIComponent(query)}`;
  const data = await fetchJsonWithTimeout(url);
  const kcal = Number(data?.calories) || Number(data?.totalNutrients?.ENERC_KCAL?.quantity) || 0;
  if (!data || kcal <= 0) return null;

  const parsedItems = (Array.isArray(data.ingredients) ? data.ingredients : [])
    .flatMap(ing => Array.isArray(ing?.parsed) ? ing.parsed : [])
    .map((p, idx) => ({
      id: `edamam-${p.foodId || idx}`,
      name: String(p.foodMatch || p.food || query).trim(),
      qty: r1(p.quantity || 1),
      unitLabel: String(p.measure || 'serving'),
      kcal: Math.max(1, Math.round(Number(p.nutrients?.ENERC_KCAL?.quantity) || kcal)),
      category: 'General',
      source: 'edamam',
      nutrients: mapEdamamNutrients(p.nutrients || {}),
    }));

  const out = {
    provider: 'edamam',
    kcal: Math.max(1, Math.round(kcal)),
    unitLabel: parsedItems.length === 1 ? parsedItems[0].unitLabel : 'serving',
    items: parsedItems.length > 0 ? parsedItems : [{
      id: 'edamam-meal',
      name: query,
      qty: 1,
      unitLabel: 'serving',
      kcal: Math.max(1, Math.round(kcal)),
      category: 'General',
      source: 'edamam',
      nutrients: mapEdamamNutrients(data.totalNutrients || {}),
    }],
    nutrients: mapEdamamNutrients(data.totalNutrients || {}),
  };
  writeCached(dataDir, key, out);
  return out;
}

async function fetchEdamamSearch(query, dataDir) {
  if (isOffline() || !hasEdamam()) return [];
  const key = `edamam:search:${cleanToken(query)}`;
  const cached = readCached(dataDir, key);
  if (Array.isArray(cached)) return cached;

  const base = (process.env.EDAMAM_API_BASE || 'https://api.edamam.com').replace(/\/$/, '');
  const url = `${base}/api/food-database/v2/parser?app_id=${encodeURIComponent(process.env.EDAMAM_APP_ID)}&app_key=${encodeURIComponent(process.env.EDAMAM_APP_KEY)}&ingr=${encodeURIComponent(query)}&nutrition-type=logging`;
  const data = await fetchJsonWithTimeout(url);
  if (!data) return [];

  const entries = [
    ...(Array.isArray(data.parsed) ? data.parsed : []),
    ...(Array.isArray(data.hints) ? data.hints : []),
  ];
  const out = [];
  for (let i = 0; i < entries.length && out.length < 6; i++) {
    const f = entries[i]?.food;
    if (!f?.label) continue;
    const n = f.nutrients || {};
    const kcal100 = Number(n.ENERC_KCAL) || 0;
    if (kcal100 <= 0) continue;
    const servMeasure = (Array.isArray(entries[i]?.measures) ? entries[i].measures : [])
      .find(m => m && m.weight > 0 && !/gram|ounce|kilogram|pound/i.test(String(m.label || '')));
    const servingG = servMeasure?.weight ? Math.round(servMeasure.weight) : 100;
    const unitLabel = servMeasure?.label ? String(servMeasure.label).toLowerCase().slice(0, 20) : '100g';
    const mult = servingG / 100;
    out.push({
      id: `edamam-${f.foodId || i}`,
      name: String(f.label).trim().slice(0, 75),
      aliases: [],
      category: 'General',
      unitLabel,
      servingG,
      kcal: Math.max(1, Math.round(kcal100 * mult)),
      source: 'edamam',
      nutrients: scaleNutrients({
        proteinG: n.PROCNT,
        carbsG: n.CHOCDF,
        fatG: n.FAT,
        fiberG: n.FIBTG,
        sugarG: n.SUGAR,
        satFatG: n.FASAT,
        sodiumMg: n.NA,
        potassiumMg: n.K,
        calciumMg: n.CA,
        ironMg: n.FE,
        magnesiumMg: n.MG,
        zincMg: n.ZN,
        vitAMcg: n.VITA_RAE,
        vitCMg: n.VITC,
        vitDMcg: n.VITD,
        vitB12Mcg: n.VITB12,
        cholesterolMg: n.CHOLE,
      }, mult),
    });
  }
  if (out.length > 0) writeCached(dataDir, key, out);
  return out;
}

/* ---------------- 2. Nutritionix Track API v2 ---------------- */

function mapNutritionixFood(f, idx = 0) {
  if (!f || typeof f !== 'object') return null;
  const name = String(f.food_name || f.brand_name_item_name || '').trim().slice(0, 75);
  const kcal = Number(f.nf_calories) || 0;
  if (!name || kcal <= 0) return null;

  const attr = new Map();
  for (const fn of Array.isArray(f.full_nutrients) ? f.full_nutrients : []) {
    if (fn && Number.isFinite(Number(fn.attr_id))) {
      attr.set(Number(fn.attr_id), Number(fn.value) || 0);
    }
  }
  const pick = (primary, attrId) => {
    const p = Number(primary);
    if (Number.isFinite(p) && p >= 0) return p;
    return attr.get(attrId) || 0;
  };

  const qty = Number(f.serving_qty) > 0 ? Number(f.serving_qty) : 1;
  const rawUnit = String(f.serving_unit || 'serving').trim().slice(0, 20) || 'serving';
  return {
    id: `nx-${f.nix_item_id || f.tag_id || idx}`,
    name: name.charAt(0).toUpperCase() + name.slice(1),
    aliases: [],
    category: 'General',
    qty: r1(qty),
    unitLabel: qty === 1 ? rawUnit : `${r1(qty)} ${rawUnit}`.slice(0, 24),
    servingG: Math.round(Number(f.serving_weight_grams) || 100),
    kcal: Math.max(1, Math.round(kcal)),
    source: 'nutritionix',
    nutrients: scaleNutrients({
      proteinG: pick(f.nf_protein, 203),
      carbsG: pick(f.nf_total_carbohydrate, 205),
      fatG: pick(f.nf_total_fat, 204),
      fiberG: pick(f.nf_dietary_fiber, 291),
      sugarG: pick(f.nf_sugars, 269),
      satFatG: pick(f.nf_saturated_fat, 606),
      sodiumMg: pick(f.nf_sodium, 307),
      potassiumMg: pick(f.nf_potassium, 306),
      calciumMg: attr.get(301) || 0,
      ironMg: attr.get(303) || 0,
      magnesiumMg: attr.get(304) || 0,
      zincMg: attr.get(309) || 0,
      vitAMcg: attr.get(320) || attr.get(319) || 0,
      vitCMg: attr.get(401) || 0,
      vitDMcg: attr.get(328) || 0,
      vitB12Mcg: attr.get(418) || 0,
      cholesterolMg: pick(f.nf_cholesterol, 601),
    }, 1),
  };
}

async function fetchNutritionixAnalyze(query, dataDir) {
  if (isOffline() || !hasNutritionix()) return null;
  const key = `nutritionix:analyze:${cleanToken(query)}`;
  const cached = readCached(dataDir, key);
  if (cached) return cached;

  const base = (process.env.NUTRITIONIX_API_BASE || 'https://trackapi.nutritionix.com').replace(/\/$/, '');
  const data = await fetchJsonWithTimeout(`${base}/v2/natural/nutrients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-app-id': process.env.NUTRITIONIX_APP_ID,
      'x-app-key': process.env.NUTRITIONIX_API_KEY,
    },
    body: JSON.stringify({ query }),
  });
  const items = (Array.isArray(data?.foods) ? data.foods : [])
    .map(mapNutritionixFood)
    .filter(Boolean);
  if (!items.length) return null;

  const totalKcal = items.reduce((s, x) => s + x.kcal, 0);
  const out = {
    provider: 'nutritionix',
    kcal: Math.max(1, totalKcal),
    unitLabel: items.length === 1 ? items[0].unitLabel : 'serving',
    items,
    nutrients: sumNutrients(items.map(x => x.nutrients)),
  };
  writeCached(dataDir, key, out);
  return out;
}

async function fetchNutritionixSearch(query, dataDir) {
  if (isOffline() || !hasNutritionix()) return [];
  const key = `nutritionix:search:${cleanToken(query)}`;
  const cached = readCached(dataDir, key);
  if (Array.isArray(cached)) return cached;

  const base = (process.env.NUTRITIONIX_API_BASE || 'https://trackapi.nutritionix.com').replace(/\/$/, '');
  const data = await fetchJsonWithTimeout(
    `${base}/v2/search/instant?query=${encodeURIComponent(query)}&detailed=true`,
    {
      headers: {
        'x-app-id': process.env.NUTRITIONIX_APP_ID,
        'x-app-key': process.env.NUTRITIONIX_API_KEY,
      },
    }
  );
  if (!data) return [];
  const rawList = [
    ...(Array.isArray(data.common) ? data.common.slice(0, 4) : []),
    ...(Array.isArray(data.branded) ? data.branded.slice(0, 4) : []),
  ];
  const out = rawList.map(mapNutritionixFood).filter(Boolean).slice(0, 6);
  if (out.length > 0) writeCached(dataDir, key, out);
  return out;
}

/* ---------------- 3. USDA FoodData Central Public API v1 ---------------- */

function cleanUsdaDescription(desc) {
  const s = String(desc || '').trim();
  if (!s) return '';
  // Branded foods are often ALL CAPS; normalize gently for readability
  const pretty = s === s.toUpperCase() && s.length > 4
    ? s.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase())
    : s;
  return pretty.slice(0, 75);
}

function mapUsdaFood(food, idx = 0) {
  if (!food || typeof food !== 'object') return null;
  const name = cleanUsdaDescription(food.description);
  if (!name) return null;

  const byId = new Map();
  const byNum = new Map();
  for (const n of Array.isArray(food.foodNutrients) ? food.foodNutrients : []) {
    if (!n) continue;
    const val = Number(n.value ?? n.amount);
    if (!Number.isFinite(val) || val < 0) continue;
    const unit = String(n.unitName || '').toUpperCase();
    // Energy can appear in KJ (id 1062) and KCAL (id 1008); only store KCAL on 1008/208
    if ((n.nutrientId === 1008 || String(n.nutrientNumber) === '208') && unit === 'KJ') continue;
    if (n.nutrientId != null && !byId.has(Number(n.nutrientId))) byId.set(Number(n.nutrientId), val);
    if (n.nutrientNumber != null && !byNum.has(String(n.nutrientNumber))) byNum.set(String(n.nutrientNumber), val);
  }

  const getN = (ids, nums = []) => {
    for (const id of ids) if (byId.has(id)) return byId.get(id);
    for (const num of nums) if (byNum.has(num)) return byNum.get(num);
    return 0;
  };

  const kcal100 = getN([1008, 2047, 2048], ['208', '957', '958']);
  if (!Number.isFinite(kcal100) || kcal100 < 1 || kcal100 > 1000) return null;

  // Determine natural serving size if USDA provides a ranked household measure (e.g. "1 egg" = 50g)
  const measures = (Array.isArray(food.foodMeasures) ? food.foodMeasures : [])
    .filter(m => m && Number(m.gramWeight) > 5 && Number(m.gramWeight) <= 600)
    .sort((a, b) => (Number(a.rank) || 99) - (Number(b.rank) || 99));

  let servingG = 100;
  let unitLabel = '100g';
  if (measures.length > 0) {
    const m0 = measures[0];
    const label = String(m0.disseminationText || m0.measureUnitName || '').trim();
    if (label && !/undetermined|quantity not specified/i.test(label)) {
      servingG = Math.round(Number(m0.gramWeight));
      unitLabel = label.replace(/^1\s+/, '').slice(0, 20) || 'serving';
    }
  } else if (Number(food.servingSize) > 5 && Number(food.servingSize) <= 500 && /^(g|gm|grams?)$/i.test(String(food.servingSizeUnit || ''))) {
    servingG = Math.round(Number(food.servingSize));
    const hh = String(food.householdServingFullText || '').trim();
    unitLabel = hh ? hh.replace(/^1\s+/, '').toLowerCase().slice(0, 20) : `${servingG}g`;
  }

  const mult = servingG / 100;
  return {
    id: `usda-${food.fdcId || idx}`,
    name,
    aliases: [],
    category: 'General',
    unitLabel,
    servingG,
    kcal: Math.max(1, Math.round(kcal100 * mult)),
    source: 'usda',
    nutrients: scaleNutrients({
      proteinG: getN([1003], ['203']),
      carbsG: getN([1005], ['205']),
      fatG: getN([1004], ['204']),
      fiberG: getN([1079], ['291']),
      sugarG: getN([2000, 1063], ['269']),
      satFatG: getN([1258], ['606']),
      sodiumMg: getN([1093], ['307']),
      potassiumMg: getN([1092], ['306']),
      calciumMg: getN([1087], ['301']),
      ironMg: getN([1089], ['303']),
      magnesiumMg: getN([1090], ['304']),
      zincMg: getN([1095], ['309']),
      vitAMcg: getN([1106, 1105], ['320', '319']),
      vitCMg: getN([1162], ['401']),
      vitDMcg: getN([1114], ['328']),
      vitB12Mcg: getN([1178], ['418']),
      cholesterolMg: getN([1253], ['601']),
    }, mult),
  };
}

async function fetchUsdaFoods(query, dataDir) {
  if (isOffline()) return [];
  const q = cleanToken(query);
  if (q.length < 2) return [];

  const cacheKey = `usda:search:${q}`;
  const cached = readCached(dataDir, cacheKey);
  if (Array.isArray(cached)) return cached;

  const base = (process.env.USDA_API_BASE || 'https://api.nal.usda.gov').replace(/\/$/, '');
  const url = `${base}/fdc/v1/foods/search?api_key=${encodeURIComponent(usdaApiKey())}&query=${encodeURIComponent(query)}&pageSize=6`;
  const data = await fetchJsonWithTimeout(url);
  if (!data || !Array.isArray(data.foods)) return [];

  // Prefer Foundation / Survey (FNDDS) / SR Legacy whole-food profiles over incomplete branded entries
  const typeRank = dt =>
    dt === 'Foundation' ? 0 : dt === 'SR Legacy' ? 1 : dt === 'Survey (FNDDS)' ? 2 : 3;

  const items = data.foods
    .slice()
    .sort((a, b) => typeRank(a?.dataType) - typeRank(b?.dataType))
    .map(mapUsdaFood)
    .filter(Boolean)
    .slice(0, 5);

  if (items.length > 0) writeCached(dataDir, cacheKey, items);
  return items;
}

/* ---------------- 4. OpenFoodFacts Public Dataset API ---------------- */

function mapOpenFoodFactsProduct(prod, idx) {
  if (!prod || typeof prod !== 'object') return null;
  const name = String(prod.product_name_en || prod.product_name || '').trim().slice(0, 75);
  if (!name) return null;
  const n = prod.nutriments || {};
  const kcal100 = Number(n['energy-kcal_100g']) || (Number(n.energy_100g) > 0 ? Number(n.energy_100g) / 4.184 : 0);
  if (!Number.isFinite(kcal100) || kcal100 < 1 || kcal100 > 1200) return null;

  const toMg = val => {
    const v = Number(val);
    if (!Number.isFinite(v) || v <= 0) return 0;
    return v < 5 ? v * 1000 : v;
  };
  const toMcg = val => {
    const v = Number(val);
    if (!Number.isFinite(v) || v <= 0) return 0;
    return v < 0.05 ? v * 1_000_000 : v < 5 ? v * 1000 : v;
  };

  return {
    id: `off-${prod.code || idx}`,
    name,
    aliases: [],
    category: 'General',
    unitLabel: '100g',
    servingG: 100,
    kcal: Math.max(1, Math.round(kcal100)),
    source: 'openfoodfacts',
    nutrients: {
      proteinG: r1(n.proteins_100g),
      carbsG: r1(n.carbohydrates_100g),
      fatG: r1(n.fat_100g),
      fiberG: r1(n.fiber_100g),
      sugarG: r1(n.sugars_100g),
      satFatG: r1(n['saturated-fat_100g']),
      sodiumMg: r0(toMg(n.sodium_100g)),
      potassiumMg: r0(toMg(n.potassium_100g)),
      calciumMg: r0(toMg(n.calcium_100g)),
      ironMg: r1(toMg(n.iron_100g)),
      magnesiumMg: r0(toMg(n.magnesium_100g)),
      zincMg: r1(toMg(n.zinc_100g)),
      vitAMcg: r0(toMcg(n['vitamin-a_100g'])),
      vitCMg: r1(toMg(n['vitamin-c_100g'])),
      vitDMcg: r1(toMcg(n['vitamin-d_100g'])),
      vitB12Mcg: r1(toMcg(n['vitamin-b12_100g'])),
      cholesterolMg: r0(toMg(n.cholesterol_100g)),
    },
  };
}

async function fetchOpenFoodFacts(query, dataDir) {
  if (isOffline()) return [];
  const q = cleanToken(query);
  if (q.length < 2) return [];

  const cacheKey = `off:search:${q}`;
  const cached = readCached(dataDir, cacheKey);
  if (Array.isArray(cached)) return cached;

  const base = (process.env.OPENFOODFACTS_API_BASE || 'https://world.openfoodfacts.org').replace(/\/$/, '');
  const url = `${base}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=6`;
  const data = await fetchJsonWithTimeout(url);
  if (!data) return [];

  const items = (Array.isArray(data?.products) ? data.products : [])
    .map(mapOpenFoodFactsProduct)
    .filter(Boolean)
    .slice(0, 5);
  if (items.length > 0) writeCached(dataDir, cacheKey, items);
  return items;
}

/* ---------------- Unified Public Nutrition Search & Meal Analysis ---------------- */

async function fetchExternalSearchItems(query, dataDir) {
  if (isOffline()) return { items: [], provider: 'curated' };

  if (hasEdamam()) {
    const ed = await fetchEdamamSearch(query, dataDir);
    if (ed.length > 0) return { items: ed, provider: 'edamam' };
  }
  if (hasNutritionix()) {
    const nx = await fetchNutritionixSearch(query, dataDir);
    if (nx.length > 0) return { items: nx, provider: 'nutritionix' };
  }

  const usda = await fetchUsdaFoods(query, dataDir);
  if (usda.length > 0) return { items: usda, provider: 'usda' };

  const off = await fetchOpenFoodFacts(query, dataDir);
  if (off.length > 0) return { items: off, provider: 'openfoodfacts' };

  return { items: [], provider: 'curated' };
}

export async function searchNutritionDb(query, limit = 12, dataDir = '/tmp') {
  const cap = Math.max(1, Math.min(30, Number(limit) || 12));
  const q = cleanToken(query);
  const providers = activeNutritionProviders();

  if (!q) {
    return {
      items: CURATED_FOODS.slice(0, cap),
      source: 'curated',
      provider: providers[0] || 'curated',
      providers,
    };
  }

  const [localMatches, external] = await Promise.all([
    Promise.resolve(
      CURATED_FOODS
        .map(f => ({ f, score: scoreFood(f, q) }))
        .filter(x => x.score >= 45)
        .sort((a, b) => b.score - a.score || a.f.name.localeCompare(b.f.name))
        .map(x => x.f)
    ),
    q.length >= 2 ? fetchExternalSearchItems(query, dataDir) : Promise.resolve({ items: [], provider: 'curated' }),
  ]);

  // Put exact/alias curated regional staples first so "doasa"/"idli" stay top-1, followed by live API hits
  const exactLocal = localMatches.filter(f => scoreFood(f, q) >= 85);
  const restLocal = localMatches.filter(f => scoreFood(f, q) < 85);
  const combined = [...exactLocal, ...external.items, ...restLocal];

  const seen = new Set();
  const merged = [];
  for (const cand of combined) {
    const k = `${cand.source}:${cleanToken(cand.name)}`;
    if (!seen.has(k)) {
      seen.add(k);
      merged.push(cand);
    }
  }

  const usedApi = external.items.length > 0 ? external.provider : null;
  const source = usedApi
    ? (localMatches.length > 0 ? `curated+${usedApi}` : usedApi)
    : 'curated';

  return {
    items: merged.slice(0, cap),
    source,
    provider: usedApi || 'curated',
    providers,
  };
}

function parseSegmentQuantity(rawSeg) {
  const s = cleanToken(rawSeg);
  if (!s) return { qty: 1, gramWeight: null, term: '' };

  const gramMatch = /^(\d+(?:\.\d+)?)\s*(?:g|gm|gms|gram|grams)\s+(.+)$/.exec(s);
  if (gramMatch) {
    return { qty: 1, gramWeight: Number(gramMatch[1]) || 100, term: gramMatch[2].trim() };
  }

  const numMatch = /^(\d+(?:\.\d+)?)\s*(?:x\s*)?(?:pieces?|piece|bowls?|bowl|cups?|cup|servings?|serving|plates?|plate|slices?|slice)?\s+(.+)$/.exec(s);
  if (numMatch) {
    return { qty: Math.max(0.25, Math.min(25, Number(numMatch[1]) || 1)), gramWeight: null, term: numMatch[2].trim() };
  }

  const parts = s.split(' ');
  if (parts.length >= 2 && WORD_NUMS[parts[0]] != null) {
    const qty = WORD_NUMS[parts[0]];
    const rest = parts.slice(1).filter((w, idx) => !(idx === 0 && /^(pieces?|bowls?|cups?|servings?|plates?|slices?|of)$/.test(w))).join(' ');
    if (rest) return { qty, gramWeight: null, term: rest };
  }

  return { qty: 1, gramWeight: null, term: s };
}

function fallbackByCategory(kcal, category = 'General') {
  const totalKcal = Math.max(20, Number(kcal) || 150);
  const cat = String(category || 'General').toLowerCase();
  const split = cat === 'protein'
    ? { p: 0.42, c: 0.18, f: 0.40 }
    : cat === 'snacks'
      ? { p: 0.12, c: 0.53, f: 0.35 }
      : cat === 'drinks'
        ? { p: 0.12, c: 0.68, f: 0.20 }
        : { p: 0.18, c: 0.52, f: 0.30 };
  const ratio = totalKcal / 200;
  return {
    proteinG: r1((totalKcal * split.p) / 4),
    carbsG: r1((totalKcal * split.c) / 4),
    fatG: r1((totalKcal * split.f) / 9),
    fiberG: r1(2.6 * ratio),
    sugarG: r1((cat === 'drinks' || cat === 'snacks' ? 7.5 : 2.8) * ratio),
    satFatG: r1(((totalKcal * split.f) / 9) * 0.28),
    sodiumMg: r0(260 * ratio),
    potassiumMg: r0(280 * ratio),
    calciumMg: r0(48 * ratio),
    ironMg: r1(1.4 * ratio),
    magnesiumMg: r0(34 * ratio),
    zincMg: r1(0.9 * ratio),
    vitAMcg: r0(55 * ratio),
    vitCMg: r1(6.5 * ratio),
    vitDMcg: r1(0.3 * ratio),
    vitB12Mcg: r1(0.3 * ratio),
    cholesterolMg: r0((cat === 'protein' ? 55 : 18) * ratio),
  };
}

async function resolveSegmentItem(seg, dataDir) {
  const { qty: segQty, gramWeight, term } = parseSegmentQuantity(seg);
  if (!term) return null;

  let localBest = null;
  let localScore = 0;
  for (const cand of CURATED_FOODS) {
    const sc = scoreFood(cand, term);
    if (sc > localScore) { localScore = sc; localBest = cand; }
  }

  // Regional South Asian dishes (e.g. "doasa", "idli", "sambar", "fish curry") use verified IFCT profiles directly
  const keepRegionalCurated = Boolean(localBest && REGIONAL_SPECIALTY_IDS.has(localBest.id) && localScore >= 75);

  let chosen = keepRegionalCurated ? localBest : null;
  if (!chosen && !isOffline()) {
    const usdaItems = await fetchUsdaFoods(term, dataDir);
    if (usdaItems.length > 0) {
      chosen = usdaItems[0];
    }
  }
  if (!chosen && localBest && localScore >= 50) {
    chosen = localBest;
  }
  if (!chosen && !isOffline()) {
    const offItems = await fetchOpenFoodFacts(term, dataDir);
    if (offItems.length > 0) {
      chosen = offItems[0];
    }
  }
  if (!chosen) return null;

  const mult = gramWeight && chosen.servingG > 0 ? gramWeight / chosen.servingG : segQty;
  return {
    id: chosen.id,
    name: chosen.name,
    qty: r1(mult),
    unitLabel: gramWeight ? `${gramWeight}g` : chosen.unitLabel,
    kcal: Math.max(1, Math.round(chosen.kcal * mult)),
    category: chosen.category || (localBest?.category || 'General'),
    source: chosen.source || 'curated',
    nutrients: scaleNutrients(chosen.nutrients, mult),
  };
}

export async function analyzeMealNutrition({ query, kcal = null, qty = 1, category = 'General' } = {}, dataDir = '/tmp') {
  const raw = String(query || '').trim().slice(0, 160);
  const multQty = Number(qty) > 0 ? Number(qty) : 1;
  const providers = activeNutritionProviders();

  // 1. If Edamam or Nutritionix natural-language APIs are configured, query them first
  if (raw && !isOffline()) {
    const nlpResult = hasEdamam()
      ? await fetchEdamamAnalyze(raw, dataDir)
      : hasNutritionix()
        ? await fetchNutritionixAnalyze(raw, dataDir)
        : null;

    if (nlpResult) {
      const baseKcal = nlpResult.kcal;
      const wantedKcal = Number(kcal) > 0 ? Math.round(Number(kcal)) : Math.round(baseKcal * multQty);
      const scale = baseKcal > 0 && Number(kcal) > 0
        ? Math.max(0.15, Math.min(8, wantedKcal / baseKcal))
        : multQty;
      return {
        query: raw,
        matched: true,
        source: nlpResult.provider,
        provider: nlpResult.provider,
        providers,
        estimatedKcal: Math.round(baseKcal * multQty),
        kcal: wantedKcal,
        category,
        unitLabel: nlpResult.unitLabel || 'serving',
        items: nlpResult.items,
        nutrients: scaleNutrients(nlpResult.nutrients, scale),
      };
    }
  }

  // 2. Multi-segment meal resolution across USDA FoodData Central + IFCT Curated + OpenFoodFacts
  const segments = raw
    .split(/\s*(?:\+|&|,|\/|\band\b|\bwith\b|\bplus\b)\s*/i)
    .map(s => s.trim())
    .filter(Boolean);

  const resolved = await Promise.all(segments.map(seg => resolveSegmentItem(seg, dataDir)));
  const matchedItems = resolved.filter(Boolean);

  if (matchedItems.length > 0) {
    const baseKcal = matchedItems.reduce((s, x) => s + x.kcal, 0);
    const baseNutrients = sumNutrients(matchedItems.map(x => x.nutrients));
    const wantedKcal = Number(kcal) > 0 ? Math.round(Number(kcal)) : Math.round(baseKcal * multQty);
    const scale = baseKcal > 0 && Number(kcal) > 0
      ? Math.max(0.15, Math.min(8, wantedKcal / baseKcal))
      : multQty;

    const distinctSources = [...new Set(matchedItems.map(x => x.source || 'curated'))];
    const primaryApi = distinctSources.find(s => s !== 'curated') || 'curated';
    const sourceLabel = distinctSources.length === 1
      ? distinctSources[0]
      : distinctSources.includes('usda')
        ? 'curated+usda'
        : distinctSources.includes('openfoodfacts')
          ? 'curated+openfoodfacts'
          : primaryApi;

    return {
      query: raw,
      matched: true,
      source: sourceLabel,
      provider: primaryApi,
      providers,
      estimatedKcal: Math.round(baseKcal * multQty),
      kcal: wantedKcal,
      category: matchedItems[0].category || category,
      unitLabel: matchedItems.length === 1 ? matchedItems[0].unitLabel : 'serving',
      items: matchedItems,
      nutrients: scaleNutrients(baseNutrients, scale),
    };
  }

  const fallbackKcal = Number(kcal) > 0 ? Math.round(Number(kcal)) : Math.round(150 * multQty);
  return {
    query: raw,
    matched: false,
    source: 'estimated',
    provider: 'estimated',
    providers,
    estimatedKcal: fallbackKcal,
    kcal: fallbackKcal,
    category,
    unitLabel: 'serving',
    items: [],
    nutrients: fallbackByCategory(fallbackKcal, category),
  };
}
