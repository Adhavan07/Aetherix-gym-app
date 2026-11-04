// Comprehensive food nutrition dataset (USDA FoodData Central + IFCT Indian Food Composition
// reference values) and natural-language multi-item meal analyzer.
// Pure functions, zero dependencies, offline-capable.

export const DAILY_VALUES = {
  proteinG: 50,
  carbsG: 275,
  fatG: 78,
  fiberG: 28,
  sugarG: 50,
  satFatG: 20,
  sodiumMg: 2300,
  potassiumMg: 4700,
  calciumMg: 1300,
  ironMg: 18,
  magnesiumMg: 420,
  zincMg: 11,
  vitAMcg: 900,
  vitCMg: 90,
  vitDMcg: 20,
  vitB12Mcg: 2.4,
  cholesterolMg: 300,
}

export const MACRO_FIELDS = [
  { key: 'proteinG', label: 'Protein', unit: 'g', kcalPerG: 4, dv: DAILY_VALUES.proteinG },
  { key: 'carbsG', label: 'Carbohydrates', unit: 'g', kcalPerG: 4, dv: DAILY_VALUES.carbsG },
  { key: 'fatG', label: 'Total fat', unit: 'g', kcalPerG: 9, dv: DAILY_VALUES.fatG },
  { key: 'fiberG', label: 'Dietary fiber', unit: 'g', subOf: 'carbsG', dv: DAILY_VALUES.fiberG },
  { key: 'sugarG', label: 'Sugars', unit: 'g', subOf: 'carbsG', dv: DAILY_VALUES.sugarG },
  { key: 'satFatG', label: 'Saturated fat', unit: 'g', subOf: 'fatG', dv: DAILY_VALUES.satFatG },
]

export const MICRO_FIELDS = [
  { key: 'ironMg', label: 'Iron', unit: 'mg', dv: DAILY_VALUES.ironMg },
  { key: 'calciumMg', label: 'Calcium', unit: 'mg', dv: DAILY_VALUES.calciumMg },
  { key: 'potassiumMg', label: 'Potassium', unit: 'mg', dv: DAILY_VALUES.potassiumMg },
  { key: 'sodiumMg', label: 'Sodium', unit: 'mg', dv: DAILY_VALUES.sodiumMg },
  { key: 'magnesiumMg', label: 'Magnesium', unit: 'mg', dv: DAILY_VALUES.magnesiumMg },
  { key: 'zincMg', label: 'Zinc', unit: 'mg', dv: DAILY_VALUES.zincMg },
  { key: 'vitAMcg', label: 'Vitamin A', unit: 'mcg', dv: DAILY_VALUES.vitAMcg },
  { key: 'vitCMg', label: 'Vitamin C', unit: 'mg', dv: DAILY_VALUES.vitCMg },
  { key: 'vitDMcg', label: 'Vitamin D', unit: 'mcg', dv: DAILY_VALUES.vitDMcg },
  { key: 'vitB12Mcg', label: 'Vitamin B12', unit: 'mcg', dv: DAILY_VALUES.vitB12Mcg },
  { key: 'cholesterolMg', label: 'Cholesterol', unit: 'mg', dv: DAILY_VALUES.cholesterolMg },
]

const ALL_KEYS = [...MACRO_FIELDS.map(f => f.key), ...MICRO_FIELDS.map(f => f.key)]

const r1 = n => Math.round((Number(n) || 0) * 10) / 10
const r0 = n => Math.round(Number(n) || 0)

function item(id, name, aliases, category, unitLabel, servingG, kcal, m) {
  return {
    id,
    name,
    aliases,
    category,
    unitLabel,
    servingG,
    kcal,
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
  }
}

export const NUTRITION_CATALOG = [
  // ---- Indian & South Asian Staples ----
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
    { p: 16.8, c: 10.4, f: 23.6, fib: 2.4, sug: 3.8, sf: 13.8, na: 480, k: 320, ca: 420, fe: 2.2, mg: 42, zn: 2.1, va: 240, vc: 14.0, vd: 0.4, vb12: 0.8, chol: 58 }),
  item('curd', 'Plain Curd / Yogurt', ['curd', 'dahi', 'yogurt', 'plain yogurt'], 'Lunch', 'bowl', 150, 98,
    { p: 5.4, c: 7.2, f: 5.0, fib: 0, sug: 7.0, sf: 3.2, na: 70, k: 235, ca: 185, fe: 0.2, mg: 18, zn: 0.9, va: 42, vc: 1.2, vd: 0.1, vb12: 0.6, chol: 19 }),

  // ---- Proteins, Eggs, Meat & Seafood ----
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

  // ---- Grains, Bread, Breakfast & Dairy ----
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
  item('ghee', 'Ghee / Clarified Butter', ['ghee', 'butter'], 'General', 'serving', 14, 123,
    { p: 0, c: 0, f: 13.9, fib: 0, sug: 0, sf: 8.7, na: 0, k: 1, ca: 1, fe: 0, mg: 0, zn: 0, va: 118, vc: 0, vd: 0.2, vb12: 0, chol: 36 }),
  item('olive-oil', 'Olive Oil', ['cooking oil', 'coconut oil'], 'General', 'serving', 14, 119,
    { p: 0, c: 0, f: 13.5, fib: 0, sug: 0, sf: 1.9, na: 0, k: 0, ca: 0, fe: 0.1, mg: 0, zn: 0, va: 0, vc: 0, vd: 0, vb12: 0, chol: 0 }),

  // ---- Fruits ----
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
  item('berries', 'Mixed Berries', ['blueberries', 'strawberries', 'raspberries'], 'Snacks', 'cup', 148, 84,
    { p: 1.1, c: 21.4, f: 0.5, fib: 3.6, sug: 14.7, sf: 0, na: 1, k: 114, ca: 9, fe: 0.4, mg: 9, zn: 0.2, va: 4, vc: 14.4, vd: 0, vb12: 0, chol: 0 }),
  item('dates', 'Medjool Dates', ['dates', 'khajoor'], 'Snacks', 'piece', 24, 66,
    { p: 0.4, c: 18.0, f: 0.04, fib: 1.6, sug: 16.0, sf: 0, na: 0, k: 167, ca: 15, fe: 0.2, mg: 13, zn: 0.1, va: 2, vc: 0, vd: 0, vb12: 0, chol: 0 }),

  // ---- Nuts & Seeds ----
  item('almonds', 'Almonds', ['badam', 'roasted almonds'], 'Snacks', 'serving', 28, 164,
    { p: 6.0, c: 6.1, f: 14.2, fib: 3.5, sug: 1.2, sf: 1.1, na: 1, k: 208, ca: 76, fe: 1.1, mg: 77, zn: 0.9, va: 0, vc: 0, vd: 0, vb12: 0, chol: 0 }),
  item('walnuts', 'Walnuts', ['akhrot'], 'Snacks', 'serving', 28, 185,
    { p: 4.3, c: 3.9, f: 18.5, fib: 1.9, sug: 0.7, sf: 1.7, na: 1, k: 125, ca: 28, fe: 0.8, mg: 45, zn: 0.9, va: 1, vc: 0.4, vd: 0, vb12: 0, chol: 0 }),
  item('peanuts', 'Roasted Peanuts', ['peanuts', 'groundnuts', 'verkadalai'], 'Snacks', 'serving', 28, 161,
    { p: 7.3, c: 4.6, f: 14.0, fib: 2.4, sug: 1.3, sf: 1.9, na: 5, k: 200, ca: 26, fe: 1.3, mg: 48, zn: 0.9, va: 0, vc: 0, vd: 0, vb12: 0, chol: 0 }),
  item('cashews', 'Cashews', ['kaju', 'roasted cashews'], 'Snacks', 'serving', 28, 157,
    { p: 5.2, c: 8.6, f: 12.4, fib: 0.9, sug: 1.7, sf: 2.2, na: 3, k: 187, ca: 10, fe: 1.9, mg: 83, zn: 1.6, va: 0, vc: 0.1, vd: 0, vb12: 0, chol: 0 }),

  // ---- Vegetables & Sides ----
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

  // ---- Everyday Global Meals ----
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
  item('dark-chocolate', 'Dark Chocolate (70%)', ['dark chocolate', 'chocolate'], 'Snacks', 'serving', 28, 170,
    { p: 2.2, c: 13.0, f: 12.1, fib: 3.1, sug: 6.8, sf: 7.0, na: 6, k: 203, ca: 21, fe: 3.4, mg: 65, zn: 0.9, va: 1, vc: 0, vd: 0, vb12: 0.1, chol: 1 }),

  // ---- Drinks ----
  item('chai', 'Masala Chai / Milk Tea', ['chai', 'tea', 'milk tea', 'masala tea', 'filter coffee', 'coffee with milk'], 'Drinks', 'cup', 180, 95,
    { p: 3.1, c: 12.8, f: 3.4, fib: 0, sug: 11.2, sf: 2.1, na: 48, k: 155, ca: 115, fe: 0.2, mg: 14, zn: 0.4, va: 44, vc: 0, vd: 1.1, vb12: 0.4, chol: 11 }),
  item('black-coffee', 'Black Coffee / Green Tea', ['black coffee', 'espresso', 'americano', 'green tea'], 'Drinks', 'cup', 240, 4,
    { p: 0.3, c: 0.4, f: 0, fib: 0, sug: 0, sf: 0, na: 5, k: 116, ca: 5, fe: 0.05, mg: 7, zn: 0.05, va: 0, vc: 0, vd: 0, vb12: 0, chol: 0 }),
  item('buttermilk', 'Spiced Buttermilk', ['buttermilk', 'chaas', 'neer mor', 'lassi'], 'Drinks', 'cup', 220, 62,
    { p: 3.4, c: 5.2, f: 2.8, fib: 0.2, sug: 4.6, sf: 1.7, na: 220, k: 185, ca: 125, fe: 0.3, mg: 16, zn: 0.6, va: 24, vc: 1.8, vd: 0.1, vb12: 0.4, chol: 10 }),
  item('coconut-water', 'Tender Coconut Water', ['coconut water', 'elaneer', 'nariyal pani'], 'Drinks', 'cup', 240, 46,
    { p: 1.7, c: 8.9, f: 0.5, fib: 2.6, sug: 6.3, sf: 0.4, na: 252, k: 600, ca: 58, fe: 0.7, mg: 60, zn: 0.2, va: 0, vc: 5.8, vd: 0, vb12: 0, chol: 0 }),
  item('orange-juice', 'Fresh Fruit Juice', ['orange juice', 'apple juice', 'fresh juice'], 'Drinks', 'cup', 240, 112,
    { p: 1.7, c: 25.8, f: 0.5, fib: 0.5, sug: 20.8, sf: 0.1, na: 2, k: 496, ca: 27, fe: 0.5, mg: 27, zn: 0.1, va: 25, vc: 124.0, vd: 0, vb12: 0, chol: 0 }),
]

const WORD_NUMS = {
  half: 0.5,
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  couple: 2,
}

const cleanToken = s =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Validates & normalizes a nutrient profile object for safe storage in synced state. */
export function sanitizeNutrients(raw) {
  if (!raw || typeof raw !== 'object') return null
  const out = {}
  let hasAny = false
  for (const key of ALL_KEYS) {
    const n = Number(raw[key])
    if (Number.isFinite(n) && n >= 0) {
      out[key] = key.endsWith('Mg') && !['ironMg', 'zincMg', 'vitCMg'].includes(key) || key === 'vitAMcg'
        ? Math.round(n)
        : r1(n)
      if (out[key] > 0) hasAny = true
    } else {
      out[key] = 0
    }
  }
  return hasAny ? out : null
}

/** Scales every macro and micronutrient field by `factor` (e.g. qty = 3 or calorie ratio). */
export function scaleNutrients(nutrients, factor = 1) {
  const f = Number(factor)
  const mult = Number.isFinite(f) && f >= 0 ? f : 0
  const out = {}
  for (const key of ALL_KEYS) {
    const v = (Number(nutrients?.[key]) || 0) * mult
    out[key] = (key.endsWith('Mg') && !['ironMg', 'zincMg', 'vitCMg'].includes(key)) || key === 'vitAMcg'
      ? Math.round(v)
      : r1(v)
  }
  return out
}

export function sumNutrientProfiles(profiles = []) {
  const out = {}
  for (const key of ALL_KEYS) out[key] = 0
  for (const p of profiles) {
    if (!p || typeof p !== 'object') continue
    for (const key of ALL_KEYS) {
      out[key] += Number(p[key]) || 0
    }
  }
  return scaleNutrients(out, 1)
}

export function percentDV(key, amount) {
  const dv = DAILY_VALUES[key]
  const n = Number(amount) || 0
  if (!dv || n <= 0) return 0
  return Math.round((n / dv) * 100)
}

/** Computes macro calorie share percentages for Protein, Carbs, and Fat. */
export function macroCalorieSplit(nutrients) {
  const pKcal = Math.max(0, (Number(nutrients?.proteinG) || 0) * 4)
  const cKcal = Math.max(0, (Number(nutrients?.carbsG) || 0) * 4)
  const fKcal = Math.max(0, (Number(nutrients?.fatG) || 0) * 9)
  const total = pKcal + cKcal + fKcal
  if (total <= 0) return { proteinPct: 0, carbsPct: 0, fatPct: 0 }
  const proteinPct = Math.round((pKcal / total) * 100)
  const carbsPct = Math.round((cKcal / total) * 100)
  const fatPct = Math.max(0, 100 - proteinPct - carbsPct)
  return { proteinPct, carbsPct, fatPct }
}

function editDistanceAtMostOne(a, b) {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 1 || a.length < 4 || b.length < 4) return false
  let i = 0, j = 0, diffs = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue }
    diffs++
    if (diffs > 1) return false
    if (a.length > b.length) i++
    else if (b.length > a.length) j++
    else { i++; j++ }
  }
  return diffs + (a.length - i) + (b.length - j) <= 1
}

function scoreCatalogItem(itemObj, q) {
  const query = cleanToken(q)
  if (!query) return 0
  const names = [itemObj.name, ...(itemObj.aliases || [])].map(cleanToken)
  let best = 0
  for (const cand of names) {
    if (!cand) continue
    if (cand === query) return 100
    if (cand.startsWith(query)) best = Math.max(best, 85)
    else if (query.startsWith(cand) && cand.length >= 3) best = Math.max(best, 78)
    else if (cand.includes(query)) best = Math.max(best, 70)
    else if (query.includes(cand) && cand.length >= 3) best = Math.max(best, 66)
    else {
      const qWords = query.split(' ')
      const cWords = cand.split(' ')
      const overlap = qWords.filter(qw =>
        cWords.some(cw => cw === qw || editDistanceAtMostOne(cw, qw) || editDistanceAtMostOne(qw.replace(/s$/, ''), cw.replace(/s$/, '')))
      ).length
      if (overlap > 0) {
        best = Math.max(best, 45 + Math.round((overlap / Math.max(qWords.length, cWords.length)) * 35))
      }
    }
  }
  return best
}

/** Searches the curated food nutrition catalog, ranked by exact/prefix/fuzzy relevance. */
export function searchNutritionCatalog(query, limit = 12) {
  const q = cleanToken(query)
  if (!q) return NUTRITION_CATALOG.slice(0, limit)
  return NUTRITION_CATALOG
    .map(it => ({ it, score: scoreCatalogItem(it, q) }))
    .filter(x => x.score >= 45)
    .sort((a, b) => b.score - a.score || a.it.name.localeCompare(b.it.name))
    .slice(0, limit)
    .map(x => x.it)
}

function parseSegmentQuantity(rawSeg) {
  let s = cleanToken(rawSeg)
  if (!s) return { qty: 1, gramWeight: null, term: '' }

  // Match e.g. "150g chicken breast" or "200 g rice"
  const gramMatch = /^(\d+(?:\.\d+)?)\s*(?:g|gm|gms|gram|grams)\s+(.+)$/.exec(s)
  if (gramMatch) {
    return { qty: 1, gramWeight: Number(gramMatch[1]) || 100, term: gramMatch[2].trim() }
  }

  // Match leading number e.g. "3 doasa" or "2 bowls dal"
  const numMatch = /^(\d+(?:\.\d+)?)\s*(?:x\s*)?(?:pieces?|piece|bowls?|bowl|cups?|cup|servings?|serving|plates?|plate|slices?|slice)?\s+(.+)$/.exec(s)
  if (numMatch) {
    return { qty: Math.max(0.25, Math.min(25, Number(numMatch[1]) || 1)), gramWeight: null, term: numMatch[2].trim() }
  }

  // Match leading word number e.g. "two eggs"
  const parts = s.split(' ')
  if (parts.length >= 2 && WORD_NUMS[parts[0]] != null) {
    const qty = WORD_NUMS[parts[0]]
    const rest = parts.slice(1).filter((w, idx) => !(idx === 0 && /^(pieces?|bowls?|cups?|servings?|plates?|slices?|of)$/.test(w))).join(' ')
    if (rest) return { qty, gramWeight: null, term: rest }
  }

  return { qty: 1, gramWeight: null, term: s }
}

function categoryFallbackNutrients(kcal, category = 'General') {
  const totalKcal = Math.max(20, Number(kcal) || 150)
  const cat = String(category || 'General').toLowerCase()
  // Balanced macro ratios tailored by food category when an unlisted custom dish is entered
  const split = cat === 'protein'
    ? { p: 0.42, c: 0.18, f: 0.40 }
    : cat === 'snacks'
      ? { p: 0.12, c: 0.53, f: 0.35 }
      : cat === 'drinks'
        ? { p: 0.12, c: 0.68, f: 0.20 }
        : { p: 0.18, c: 0.52, f: 0.30 }
  const ratio = totalKcal / 200
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
  }
}

/**
 * Parses natural meal text (including multi-item descriptions such as
 * "3 doasa and fish curry" or "rice and fish curry and two eggs"), matches each component
 * against the dataset, and scales macros + micronutrients to `targetKcal` when supplied.
 */
export function analyzeFoodText(text, targetKcal = null, category = 'General', extraItems = []) {
  const raw = String(text || '').trim()
  const segments = raw
    .split(/\s*(?:\+|&|,|\/|\band\b|\bwith\b|\bplus\b)\s*/i)
    .map(s => s.trim())
    .filter(Boolean)

  const catalog = [...extraItems, ...NUTRITION_CATALOG]
  const matchedItems = []

  for (const seg of segments) {
    const { qty, gramWeight, term } = parseSegmentQuantity(seg)
    if (!term) continue
    let best = null
    let bestScore = 0
    for (const cand of catalog) {
      const sc = scoreCatalogItem(cand, term)
      if (sc > bestScore) {
        bestScore = sc
        best = cand
      }
    }
    if (best && bestScore >= 50) {
      const mult = gramWeight && best.servingG > 0 ? gramWeight / best.servingG : qty
      matchedItems.push({
        id: best.id,
        name: best.name,
        qty: r1(mult),
        unitLabel: gramWeight ? `${gramWeight}g` : best.unitLabel,
        kcal: Math.max(1, Math.round(best.kcal * mult)),
        category: best.category,
        nutrients: scaleNutrients(best.nutrients, mult),
      })
    }
  }

  if (matchedItems.length > 0) {
    const rawKcal = matchedItems.reduce((s, x) => s + x.kcal, 0)
    const rawNutrients = sumNutrientProfiles(matchedItems.map(x => x.nutrients))
    const wantedKcal = Number(targetKcal) > 0 ? Math.round(Number(targetKcal)) : rawKcal
    const scale = rawKcal > 0 && Number(targetKcal) > 0
      ? Math.max(0.15, Math.min(8, wantedKcal / rawKcal))
      : 1
    return {
      matched: true,
      source: 'database',
      estimatedKcal: rawKcal,
      kcal: wantedKcal,
      category: matchedItems[0].category || category,
      unitLabel: matchedItems.length === 1 ? matchedItems[0].unitLabel : 'serving',
      items: matchedItems,
      nutrients: scale === 1 ? rawNutrients : scaleNutrients(rawNutrients, scale),
    }
  }

  const fallbackKcal = Number(targetKcal) > 0 ? Math.round(Number(targetKcal)) : 150
  return {
    matched: false,
    source: 'estimated',
    estimatedKcal: fallbackKcal,
    kcal: fallbackKcal,
    category,
    unitLabel: 'serving',
    items: [],
    nutrients: categoryFallbackNutrients(fallbackKcal, category),
  }
}

/**
 * Resolves the full macro & micronutrient profile for a logged food entry (`foodLog[]`),
 * accounting for `entry.qty` and falling back seamlessly for legacy entries logged before
 * per-item nutrients were stored.
 */
export function resolveEntryNutrition(entry, foods = []) {
  if (!entry || typeof entry !== 'object') {
    return { kcal: 0, source: 'estimated', items: [], nutrients: scaleNutrients({}, 0) }
  }
  const qty = Number(entry.qty) > 0 ? Number(entry.qty) : 1
  const totalKcal = Number(entry.kcal) > 0 ? Math.round(Number(entry.kcal)) : Math.round((Number(entry.kcalPerUnit) || 100) * qty)

  const ownPerUnit = sanitizeNutrients(entry.nutrients)
  if (ownPerUnit) {
    const analysis = analyzeFoodText(entry.name, null)
    return {
      kcal: totalKcal,
      source: entry.nutrientSource || 'stored',
      items: analysis.items,
      nutrients: scaleNutrients(ownPerUnit, qty),
    }
  }

  const linked = Array.isArray(foods)
    ? foods.find(f => f && (f.id === entry.foodId || String(f.name || '').toLowerCase() === String(entry.name || '').toLowerCase()))
    : null
  const libPerUnit = sanitizeNutrients(linked?.nutrients)
  if (libPerUnit) {
    const analysis = analyzeFoodText(entry.name, null)
    return {
      kcal: totalKcal,
      source: linked?.nutrientSource || 'library',
      items: analysis.items,
      nutrients: scaleNutrients(libPerUnit, qty),
    }
  }

  const analyzed = analyzeFoodText(entry.name, totalKcal, linked?.category || 'General')
  return {
    kcal: totalKcal,
    source: analyzed.source,
    items: analyzed.items,
    nutrients: analyzed.nutrients,
  }
}

/** Sums daily macronutrients and micronutrients across all `entries` on a day. */
export function dailyNutrientTotals(entries = [], foods = []) {
  const list = Array.isArray(entries) ? entries : []
  return sumNutrientProfiles(list.map(e => resolveEntryNutrition(e, foods).nutrients))
}
