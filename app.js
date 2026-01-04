const today = new Date().toDateString();

let data = JSON.parse(localStorage.getItem(today)) || {
  food: [],
  exercise: []
};

function addFood() {
  const name = foodName.value;
  const calories = Number(foodCalories.value);
  if (!name || !calories) return;

  data.food.push({ name, calories });
  save();
}

function addExercise() {
  const name = exerciseName.value;
  const calories = Number(exerciseCalories.value);
  if (!name || !calories) return;

  data.exercise.push({ name, calories });
  save();
}

function save() {
  localStorage.setItem(today, JSON.stringify(data));
  updateSummary();
}

function updateSummary() {
  const foodTotal = data.food.reduce((a, b) => a + b.calories, 0);
  const exerciseTotal = data.exercise.reduce((a, b) => a + b.calories, 0);
  const net = foodTotal - exerciseTotal;

  summary.innerText = `
Food: ${foodTotal} kcal
Exercise: ${exerciseTotal} kcal
Net: ${net} kcal
`;
}

updateSummary();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}