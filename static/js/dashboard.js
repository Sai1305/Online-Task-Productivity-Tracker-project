// ===== Tab Switching =====
function showTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

  const tabButton = document.querySelector(`[data-tab="${tabId}"]`);
  const tabContent = document.getElementById(`${tabId}-tab`);

  if (tabButton) tabButton.classList.add('active');
  if (tabContent) tabContent.classList.add('active');

  if (tabId === 'analytics') {
    initializeAnalytics();
  }
}

// ===== Modal Controls =====
function openTaskModal() {
  document.getElementById('taskModal')?.classList.add('show');
}

function closeTaskModal() {
  document.getElementById('taskModal')?.classList.remove('show');
  resetModalToAddMode();
}

function resetModalToAddMode() {
  const form = document.getElementById('taskForm');
  if (!form) return;

  document.querySelector('.modal-header h3').textContent = 'Add New Task';
  form.action = '/add-task';
  form.reset();

  document.getElementById('priority').value = 'Medium';
  document.getElementById('completed').value = 'False';
  document.querySelector('.btn-primary').innerHTML = '<i class="fas fa-save"></i> Save Task';
}

window.addEventListener('click', e => {
  const modal = document.getElementById('taskModal');
  if (e.target === modal) closeTaskModal();
});

// ===== Edit Task =====
function editTask(taskId) {
  const card = document.querySelector(`[data-task-id="${taskId}"]`);
  if (!card) return;

  document.getElementById('title').value = card.querySelector('.task-title')?.textContent.trim() || '';
  document.getElementById('description').value = card.querySelector('.task-desc')?.textContent.trim() || '';

  const priorityText = card.querySelector('.priority-badge p')?.textContent.trim() || 'Medium';
  document.getElementById('priority').value = priorityText;

  const dueText = card.querySelector('.task-info p:nth-child(1)')?.textContent || '';
  const timeText = card.querySelector('.task-info p:nth-child(2)')?.textContent || '';
  const isCompleted = card.querySelector('.status-complete') !== null;

  const dueDate = dueText.replace('Due:', '').trim();
  const estTime = timeText.replace('Estimated:', '').replace('hrs', '').trim();

  document.getElementById('due_date').value = dueDate !== 'No due date' ? dueDate : '';
  document.getElementById('time_spent').value = estTime;
  document.getElementById('completed').value = isCompleted ? 'True' : 'False';

  document.querySelector('.modal-header h3').textContent = 'Edit Task';
  document.getElementById('taskForm').action = `/edit-task/${taskId}`;
  document.querySelector('.btn-primary').innerHTML = '<i class="fas fa-save"></i> Update Task';

  openTaskModal();
}

// ===== Task Filter & Sort =====
function filterTasks() {
  const query = document.getElementById('task-search').value.toLowerCase();
  document.querySelectorAll('.task-card').forEach(card => {
    const title = card.querySelector('h4')?.innerText.toLowerCase() || '';
    const desc = card.querySelector('.task-desc')?.innerText.toLowerCase() || '';
    card.style.display = title.includes(query) || desc.includes(query) ? '' : 'none';
  });
}

function applySort() {
  const type = document.getElementById('filter-dropdown').value;
  const container = document.getElementById('task-list');
  const tasks = Array.from(container.getElementsByClassName('task-card'));

  const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 };

  tasks.sort((a, b) => {
    const aPriority = a.dataset.priority || '';
    const bPriority = b.dataset.priority || '';

    if (type === 'newest') return new Date(b.dataset.created) - new Date(a.dataset.created);
    if (type === 'oldest') return new Date(a.dataset.created) - new Date(b.dataset.created);
    if (['high', 'medium', 'low'].includes(type)) {
      return (priorityOrder[aPriority] || 99) - (priorityOrder[bPriority] || 99);
    }
    return 0;
  });

  tasks.forEach(task => container.appendChild(task));
}

// ===== Time Tracking =====
const timers = {};
const intervals = {};

function formatTime(secs) {
  const h = String(Math.floor(secs / 3600)).padStart(2, '0');
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function startTimer(taskId) {
  if (!timers[taskId]) timers[taskId] = 0;

  if (!intervals[taskId]) {
    intervals[taskId] = setInterval(() => {
      timers[taskId]++;
      const timerEl = document.getElementById(`timer-${taskId}`);
      if (timerEl) timerEl.innerText = formatTime(timers[taskId]);
    }, 1000);
  }
}

function pauseTimer(taskId) {
  if (intervals[taskId]) {
    clearInterval(intervals[taskId]);
    intervals[taskId] = null;
  }
}

function logTime(taskId) {
  pauseTimer(taskId);
  const hours = (timers[taskId] / 3600).toFixed(2);

  fetch(`/log-time/${taskId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actual_time_spent: hours })
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message || 'Time logged!');
      location.reload();
    })
    .catch(() => alert('Failed to log time.'));
}

// ===== Analytics (Chart.js) =====
let chartsInitialized = false;

function initializeAnalytics() {
  if (chartsInitialized) return;
  chartsInitialized = true;

  const parse = id => {
    try {
      return JSON.parse(document.getElementById(id)?.textContent || '[]');
    } catch (e) {
      return [];
    }
  };

  // Purple color palette
  const purple = {
    primary: 'rgba(124, 58, 237, 0.7)',
    primaryBorder: 'rgba(124, 58, 237, 1)',
    light: 'rgba(168, 85, 247, 0.6)',
    lightBorder: 'rgba(168, 85, 247, 1)',
  };

  // Tasks per Day
  new Chart(document.getElementById('taskCreationChart'), {
    type: 'bar',
    data: {
      labels: parse('dailyLabels'),
      datasets: [{
        label: 'Tasks per Day',
        data: parse('dailyData'),
        backgroundColor: purple.primary,
        borderColor: purple.primaryBorder,
        borderWidth: 2,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } },
        x: { grid: { display: false } }
      }
    }
  });

  // Priority Distribution
  const priorityData = parse('priorityData');
  new Chart(document.getElementById('priorityChart'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(priorityData),
      datasets: [{
        data: Object.values(priorityData),
        backgroundColor: ['#ef4444', '#f59e0b', '#22c55e'],
        borderWidth: 0,
        spacing: 4,
      }]
    },
    options: {
      responsive: true,
      cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } }
      }
    }
  });

  // Completion Rate
  const completionData = parse('completionData');
  new Chart(document.getElementById('completionChart'), {
    type: 'doughnut',
    data: {
      labels: ['Completed', 'Pending'],
      datasets: [{
        data: [completionData.completed || 0, completionData.pending || 0],
        backgroundColor: ['#7c3aed', '#e5e7eb'],
        borderWidth: 0,
        spacing: 4,
      }]
    },
    options: {
      responsive: true,
      cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } }
      }
    }
  });

  // Estimated vs Actual Time
  new Chart(document.getElementById('timeChart'), {
    type: 'bar',
    data: {
      labels: parse('timeLabels'),
      datasets: [
        {
          label: 'Estimated',
          data: parse('estimatedTimes'),
          backgroundColor: purple.primary,
          borderRadius: 6,
        },
        {
          label: 'Actual',
          data: parse('actualTimes'),
          backgroundColor: purple.light,
          borderRadius: 6,
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } }
      },
      scales: {
        y: { beginAtZero: true },
        x: { grid: { display: false } }
      }
    }
  });
}

// ===== Default Tab Load =====
document.addEventListener('DOMContentLoaded', () => showTab('tasks'));
