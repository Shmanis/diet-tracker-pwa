const todayKey = new Date().toISOString().split("T")[0];

const workouts = {
  A: [
    { id: "bench", name: "Dumbbell Bench Press", calories: 40 },
    { id: "row", name: "Bent-Over Row", calories: 40 },
    { id: "squat", name: "Goblet Squat", calories: 50 },
    { id: "shoulder", name: "Shoulder Press", calories: 35 },
    { id: "plank", name: "Plank", calories: 25 }
  ],
  B: [
    { id: "incline", name: "Incline DB Press", calories: 40 },
    { id: "onearm", name: "One-Arm Row", calories: 40 },
    { id: "rdl", name: "Romanian Deadlift", calories: 50 },
    { id: "lunges", name: "Lunges", calories: 45 },
    { id: "crunch", name: "Bicycle Crunch", calories: 25 }
  ]
};

let data = JSON.parse(localStorage.getItem(todayKey)) || {
  cardioDone: false,
  cardioMinutes: 30,
  workoutType: "",
  exercisesDone: [],
  caloriesBurned: 0
};

function save() {
  localStorage.setItem(todayKey, JSON.stringify(data));
  updateToday();
}

function showView(view) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(view + "View").classList.add("active");
  document.getElementById("pageTitle").innerText =
    view.charAt(0).toUpperCase() + view.slice(1);
}

function renderExercises() {
  const list = document.getElementById("exerciseList");
  list.innerHTML = "";

  const workout = workouts[data.workoutType];
  if (!workout) return;

  workout.forEach(ex => {
    const checked = data.exercisesDone.includes(ex.id);
    const row = document.createElement("div");

    row.innerHTML = `
      <label>
        <input type="checkbox" ${checked ? "checked" : ""} />
        ${ex.name} (${ex.calories} kcal)
      </label>
    `;

    row.querySelector("input").addEventListener("change", e => {
      if (e.target.checked) {
        data.exercisesDone.push(ex.id);
        data.caloriesBurned += ex.calories;
      } else {
        data.exercisesDone = data.exercisesDone.filter(id => id !== ex.id);
        data.caloriesBurned -= ex.calories;
      }
      save();
    });

    list.appendChild(row);
  });
}

function updateToday() {
  document.getElementById("burned").innerText = data.caloriesBurned;
  document.getElementById("consumed").innerText = 0;
  document.getElementById("net").innerText = data.caloriesBurned * -1;
}

document.getElementById("cardioDone").checked = data.cardioDone;
document.getElementById("cardioMinutes").value = data.cardioMinutes;
document.getElementById("workoutType").value = data.workoutType;

document.getElementById("cardioDone").addEventListener("change", e => {
  data.cardioDone = e.target.checked;
  data.caloriesBurned += e.target.checked ? 200 : -200;
  save();
});

document.getElementById("cardioMinutes").addEventListener("change", e => {
  data.cardioMinutes = Number(e.target.value);
  save();
});

document.getElementById("workoutType").addEventListener("change", e => {
  data.workoutType = e.target.value;
  data.exercisesDone = [];
  data.caloriesBurned = data.cardioDone ? 200 : 0;
  renderExercises();
  save();
});

renderExercises();
updateToday();