// ----- Data model & defaults -----
const DAILY_CAL_MIN = 1600;
const DAILY_CAL_MAX = 1700;
const DEFAULT_TARGET = (DAILY_CAL_MIN + DAILY_CAL_MAX) / 2;

const workouts = {
  A: [
    { id: "db_bench_press", name: "Dumbbell Bench Press", calories: 40, video: "https://www.youtube.com/watch?v=VmB1G1K7v94" },
    { id: "bent_row", name: "Dumbbell Bent-Over Row", calories: 40, video: "https://www.youtube.com/watch?v=roCP6wCXPqo" },
    { id: "goblet_squat", name: "Goblet Squat", calories: 50, video: "https://www.youtube.com/watch?v=MeIiIdhvxt0" },
    { id: "shoulder_press", name: "Dumbbell Shoulder Press", calories: 35, video: "https://www.youtube.com/watch?v=B-aVuyhvLHU" },
    { id: "plank", name: "Plank (30-45s)", calories: 20, video: "https://www.youtube.com/watch?v=pSHjTRCQxIw" }
  ],
  B: [
    { id: "incline_db", name: "Incline Dumbbell Press", calories: 40, video: "https://www.youtube.com/watch?v=8iPEnn-ltC8" },
    { id: "onearm_row", name: "One-Arm Dumbbell Row", calories: 40, video: "https://www.youtube.com/watch?v=pYcpY20QaE8" },
    { id: "rdl", name: "Dumbbell Romanian Deadlift", calories: 50, video: "https://www.youtube.com/watch?v=2SHsk9AzdjA" },
    { id: "lunges", name: "Dumbbell Lunges", calories: 45, video: "https://www.youtube.com/watch?v=QOVaHwm-Q6U" },
    { id: "bicycle", name: "Bicycle Crunch", calories: 20, video: "https://www.youtube.com/watch?v=9FGilxCbdz8" }
  ]
};

const foods = {
  breakfast: [
    { id: "oats_shake", name: "Oats Shake (40g + milk + whey)", calories: 450 },
    { id: "eggs", name: "Eggs (2 whole + 1 white)", calories: 220 },
    { id: "almonds", name: "Almonds (8)", calories: 50 },
    { id: "anjeer", name: "Anjeer (1 small)", calories: 30 },
    { id: "apple", name: "Apple (1)", calories: 60 }
  ],
  lunch: [
    { id: "roti", name: "Roti (ragi/bajra) - 1 small", calories: 80 },
    { id: "sabzi", name: "Sabzi (veg bowl)", calories: 120 },
    { id: "dal", name: "Dal (1/2-3/4 bowl)", calories: 120 },
    { id: "curd", name: "Curd (150g)", calories: 90 }
  ],
  dinner: [
    { id: "roti_d", name: "Roti (ragi/bajra) - 1 small", calories: 80 },
    { id: "sabzi_d", name: "Sabzi (veg bowl)", calories: 120 },
    { id: "dal_d", name: "Dal (1/2-3/4 bowl)", calories: 120 }
  ]
};

function isoDateKey(date = new Date()){ return date.toISOString().split('T')[0]; }

function loadDay(key){
  const raw = localStorage.getItem('day:'+key);
  if(!raw) return null;
  try{ return JSON.parse(raw); }catch(e){ return null; }
}

function saveDay(key, obj){
  localStorage.setItem('day:'+key, JSON.stringify(obj));
}

function getOrCreateDay(key){
  let d = loadDay(key);
  if(d) return d;
  d = {
    date: key,
    cardio: { done:false, minutes:30, intervals:false, calories:0 },
    strength: { workoutType:'', exercisesDone:[], calories:0 },
    food: { breakfast:[], lunch:[], dinner:[], overrides:[] },
    waterLiters: 0,
    sleepHours: 0,
    summary: { caloriesIn:0, caloriesOut:0, netCalories:0, status:'unknown' },
    notes: ''
  };
  saveDay(key,d);
  return d;
}

// current working date
let currentKey = isoDateKey();
let day = getOrCreateDay(currentKey);

// ----- UI helpers -----
function showView(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById(view+'View').classList.add('active');
  document.getElementById('headerDate').innerText = view==='today' ? 'Today' : view.charAt(0).toUpperCase()+view.slice(1);
}

function updateHeaderStatus(){
  const s = day.summary.status;
  const el = document.getElementById('headerStatus');
  el.innerText = s==='on-track' ? 'On Track' : (s==='partial' ? 'Partial' : (s==='off' ? 'Off Track' : 'â'));
  el.className = 'status-badge ' + (s || '');
}

// ----- Calculation logic -----
function recalcSummary(){
  // calories from food
  const foodCals = (day.food.breakfast || []).concat(day.food.lunch || [], day.food.dinner || []).reduce((a,i)=>a + (i.calories||0), 0)
    + (day.food.overrides || []).reduce((a,i)=>a + (i.calories||0),0);

  // cardio calories estimate
  const cardioCals = day.cardio.done ? estimateCardio(day.cardio.minutes, day.cardio.intervals) : 0;

  // strength calories is sum of exercise calories (we store per-exercise)
  const strengthCals = day.strength.calories || 0;

  day.summary.caloriesIn = foodCals;
  day.summary.caloriesOut = Math.round(cardioCals + strengthCals);
  day.summary.netCalories = Math.round((DEFAULT_TARGET) - day.summary.caloriesIn + day.summary.caloriesOut);
  // status
  const exercisedPercent = getExerciseCompletionPercent();
  if(day.summary.caloriesIn >= DAILY_CAL_MIN && day.summary.caloriesIn <= DAILY_CAL_MAX && exercisedPercent >= 0.8 && day.cardio.done) day.summary.status='on-track';
  else if(exercisedPercent >= 0.5 || day.cardio.done) day.summary.status='partial';
  else day.summary.status='off';

  saveDay(currentKey, day);
  updateTodayView();
  updateHeaderStatus();
}

function estimateCardio(minutes, intervals){
  const map = {30:180, 35:220, 40:260};
  let val = map[minutes] || 180;
  if(intervals) val = Math.round(val * 1.10);
  return val;
}

function getExerciseCompletionPercent(){
  const wt = day.strength.workoutType;
  if(!wt) return 0;
  const total = workouts[wt].length;
  const done = day.strength.exercisesDone.length;
  return done / total;
}

// ----- Today UI -----
function updateTodayView(){
  document.getElementById('burned').innerText = day.summary.caloriesOut;
  document.getElementById('consumed').innerText = day.summary.caloriesIn;
  document.getElementById('net').innerText = day.summary.netCalories;
  document.getElementById('waterVal').innerText = day.waterLiters.toFixed(1);
  document.getElementById('sleepVal').value = day.sleepHours || '';
  const wt = day.strength.workoutType;
  const done = day.strength.exercisesDone.length;
  const total = wt ? workouts[wt].length : 0;
  document.getElementById('progressText').innerText = total ? done + ' / ' + total : '0 / 0';
}

// ----- Exercise UI -----
function renderExercises(){
  const list = document.getElementById('exerciseList');
  list.innerHTML = '';
  const wt = day.strength.workoutType;
  if(!wt) { list.innerHTML = '<p class="muted">Choose a workout to see exercises</p>'; return; }
  workouts[wt].forEach(ex => {
    const checked = day.strength.exercisesDone.includes(ex.id);
    const row = document.createElement('div');
    row.className = 'meal-item';
    row.innerHTML = `
      <div><label><input type="checkbox" ${checked? 'checked':''}> ${ex.name}</label></div>
      <div class="food-controls"><div class="muted">${ex.calories} kcal</div><button class="small" onclick="openVideo('${ex.video}')">â¶</button></div>
    `;
    const chk = row.querySelector('input');
    chk.addEventListener('change', e=>{
      if(e.target.checked){
        if(!day.strength.exercisesDone.includes(ex.id)){
          day.strength.exercisesDone.push(ex.id);
          day.strength.calories = (day.strength.calories || 0) + ex.calories;
        }
      }else{
        day.strength.exercisesDone = day.strength.exercisesDone.filter(id=>id!==ex.id);
        day.strength.calories = Math.max(0, (day.strength.calories || 0) - ex.calories);
      }
      recalcSummary();
    });
    list.appendChild(row);
  });
}

// ----- Food UI -----
function renderFood(){
  const container = document.getElementById('foodMeals');
  container.innerHTML = '';
  ['breakfast','lunch','dinner'].forEach(meal=>{
    const block = document.createElement('div');
    block.className = 'food-section';
    block.innerHTML = `<h3>${meal.charAt(0).toUpperCase()+meal.slice(1)}</h3>`;
    foods[meal].forEach(item=>{
      const selected = (day.food[meal] || []).some(f=>f.id===item.id);
      const row = document.createElement('div');
      row.className = 'meal-item';
      row.innerHTML = `
        <div>${item.name}</div>
        <div class="food-controls">
          <div class="muted">${item.calories} kcal</div>
          <button class="small">${selected? 'Remove':'Add'}</button>
        </div>
      `;
      const btn = row.querySelector('button');
      btn.addEventListener('click', ()=>{
        if(meal==='breakfast'){
          const hasOats = (day.food.breakfast || []).some(f=>f.id==='oats_shake');
          const hasEggs = (day.food.breakfast || []).some(f=>f.id==='eggs');
          if(item.id==='oats_shake' && hasEggs){ if(!confirm('Oats + Eggs together is not recommended. Add anyway?')) return; }
          if(item.id==='eggs' && hasOats){ if(!confirm('Oats + Eggs together is not recommended. Add anyway?')) return; }
        }
        if(meal==='dinner' && item.id==='curd'){ alert('Curd not allowed at night.'); return; }
        const arr = day.food[meal]||[];
        const exists = arr.find(f=>f.id===item.id);
        if(exists){
          day.food[meal] = arr.filter(f=>f.id!==item.id);
        }else{
          arr.push({ id:item.id, name:item.name, calories:item.calories });
          day.food[meal] = arr;
        }
        recalcSummary();
        renderFood();
      });
      block.appendChild(row);
    });
    container.appendChild(block);
  });
  renderOverrides();
}

function renderOverrides(){
  const list = document.getElementById('overrideList');
  list.innerHTML = '';
  (day.food.overrides||[]).forEach((o,idx)=>{
    const row = document.createElement('div');
    row.className = 'meal-item';
    row.innerHTML = `<div>${o.item} â ${o.calories} kcal <div class="muted">${o.reason||''}</div></div><div><button class="small" onclick="removeOverride(${idx})">Remove</button></div>`;
    list.appendChild(row);
  });
}

// ----- Calendar UI -----
function buildCalendar(){
  const cal = document.getElementById('calendar');
  cal.innerHTML = '';
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year,month,1);
  const startDay = first.getDay();
  const days = new Date(year, month+1, 0).getDate();

  const grid = document.createElement('div');
  grid.className = 'calendar-grid';
  for(let i=0;i<startDay;i++) grid.appendChild(document.createElement('div'));
  for(let d=1; d<=days; d++){
    const date = new Date(year,month,d);
    const key = isoDateKey(date);
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    const dayObj = loadDay(key);
    if(dayObj && dayObj.summary){
      let cls='';
      if(dayObj.summary.status==='on-track') cls='green';
      else if(dayObj.summary.status==='partial') cls='yellow';
      else cls='red';
      cell.classList.add(cls);
    }
    cell.innerHTML = `<div class="date">${d}</div>`;
    cell.addEventListener('click', ()=>{ showDayDetails(key); });
    grid.appendChild(cell);
  }
  cal.appendChild(grid);
}

function showDayDetails(key){
  const det = document.getElementById('dayDetails');
  const dd = loadDay(key);
  det.style.display = 'block';
  if(!dd){ det.innerHTML = '<p>No data</p>'; return; }
  det.innerHTML = `<h3>${key}</h3>
    <p><strong>Cardio:</strong> ${dd.cardio.done ? 'Yes ('+dd.cardio.minutes+' min)' : 'No'}</p>
    <p><strong>Workout:</strong> ${dd.strength.workoutType || 'â'}</p>
    <p><strong>Exercises done:</strong> ${(dd.strength.exercisesDone||[]).join(', ') || 'â'}</p>
    <p><strong>Calories In:</strong> ${dd.summary.caloriesIn}</p>
    <p><strong>Calories Out:</strong> ${dd.summary.caloriesOut}</p>
    <p><strong>Net:</strong> ${dd.summary.netCalories}</p>`;
}

// ----- overrides modal -----
function openAddOverride(){ document.getElementById('modal').setAttribute('aria-hidden','false'); }
function closeModal(){ document.getElementById('modal').setAttribute('aria-hidden','true'); }
function saveOverride(){
  const name = document.getElementById('ovName').value || 'Custom';
  const cals = Number(document.getElementById('ovCals').value) || 0;
  const reason = document.getElementById('ovReason').value || '';
  day.food.overrides = day.food.overrides || [];
  day.food.overrides.push({ item:name, calories:cals, reason:reason, time:Date.now() });
  closeModal();
  recalcSummary();
  renderOverrides();
}

function openVideo(url){ window.open(url,'_blank') }
function removeOverride(idx){ day.food.overrides.splice(idx,1); recalcSummary(); renderOverrides(); }

// ----- events -----
document.getElementById('cardioDone').addEventListener('change', e=>{ day.cardio.done = e.target.checked; recalcSummary(); });
document.getElementById('cardioMinutes').addEventListener('change', e=>{ day.cardio.minutes = Number(e.target.value); recalcSummary(); });
document.getElementById('cardioIntervals').addEventListener('change', e=>{ day.cardio.intervals = e.target.checked; recalcSummary(); });

document.getElementById('workoutType').addEventListener('change', e=>{
  day.strength.workoutType = e.target.value;
  day.strength.exercisesDone = [];
  day.strength.calories = 0;
  saveDay(currentKey, day);
  renderExercises();
  recalcSummary();
});

document.getElementById('waterInc').addEventListener('click', ()=>{ day.waterLiters = +(day.waterLiters + 0.25).toFixed(2); saveDay(currentKey, day); updateTodayView(); });
document.getElementById('waterDec').addEventListener('click', ()=>{ day.waterLiters = Math.max(0, +(day.waterLiters - 0.25).toFixed(2)); saveDay(currentKey, day); updateTodayView(); });
document.getElementById('sleepVal').addEventListener('change', e=>{ day.sleepHours = Number(e.target.value); saveDay(currentKey, day); });

// ----- init -----
function init(){
  showView('today');
  renderExercises();
  renderFood();
  recalcSummary();
  buildCalendar();
  updateTodayView();
  updateHeaderStatus();
  document.getElementById('cardioDone').checked = day.cardio.done;
  document.getElementById('cardioMinutes').value = day.cardio.minutes;
  document.getElementById('cardioIntervals').checked = day.cardio.intervals;
  document.getElementById('workoutType').value = day.strength.workoutType;
}

init();

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('service-worker.js').catch(e=>console.warn('SW fail',e));
}
