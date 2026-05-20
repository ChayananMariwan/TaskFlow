let editingTaskId = null;
let allTasks = [];
let chartInstance = null;

/* =========================
   LOAD USER
========================= */
async function loadUser() {
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  if (user) {
    document.getElementById("userEmail").textContent = user.email;
  }

  const hour = new Date().getHours();

  let greeting = "Good Evening";

  if (hour < 12) greeting = "Good Morning";
  else if (hour < 18) greeting = "Good Afternoon";

  const name = user.email.split("@")[0];

  document.getElementById("welcomeText").textContent =
    `${greeting}, ${name} 👋`;
}

/* =========================
   LOGOUT
========================= */
async function logout() {
  await supabaseClient.auth.signOut();

  window.location.href = "index.html";
}

/* =========================
   OPEN/CLOSE MODAL
========================= */
function openModal() {
  document.getElementById("taskModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("taskModal").style.display = "none";
}

/* =========================
   SAVE
========================= */
async function saveTask() {
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  if (!user) {
    alert("Please login again");
    window.location.href = "index.html";
    return;
  }

  const title = document.getElementById("title").value;
  const description = document.getElementById("description").value;
  const category = document.getElementById("category").value;
  const priority = document.getElementById("priority").value;
  const status = document.getElementById("status").value;
  const tagsInput = document.getElementById("tagsInput").value;
  const tags = tagsInput
    ? tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t)
    : [];
  const dueDate = document.getElementById("dueDate").value;

  if (!title) {
    alert("Please enter task title");
    return;
  }

  let error;

  if (editingTaskId) {
    const result = await supabaseClient
      .from("tasks")
      .update({
        title,
        description,
        category,
        priority,
        status,
        due_date: dueDate,
        tags,
      })
      .eq("id", editingTaskId);

    error = result.error;
  } else {
    const result = await supabaseClient.from("tasks").insert([
      {
        user_id: user.id,
        title,
        description,
        category,
        priority,
        status,
        due_date: dueDate,
        tags,
      },
    ]);

    error = result.error;
  }
  if (error) {
    console.error(error);

    alert(error.message);

    return;
  }

  alert("Task Created");

  editingTaskId = null;

  document.getElementById("title").value = "";
  document.getElementById("description").value = "";
  //document.getElementById("relatedPerson").value = "";
  document.getElementById("dueDate").value = "";

  closeModal();
  loadTasks();
}

/* =========================
   LOADTASK
========================= */
async function loadTasks() {
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  const { data, error } = await supabaseClient
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(error);
    return;
  }

  allTasks = data || [];

  const emptyDashboard = document.getElementById("emptyDashboard");
  const taskBoard = document.getElementById("taskBoard");
  const chartSection = document.getElementById("chartSection");
  const statsSection = document.getElementById("statsSection");
  const toolbar = document.querySelector(".toolbar");

  if (allTasks.length === 0) {
    emptyDashboard.style.display = "flex";
    taskBoard.style.display = "none";
    chartSection.style.display = "none";
    statsSection.style.display = "none";
    toolbar.style.display = "none";
    return;
  }

  emptyDashboard.style.display = "none";
  taskBoard.style.display = "grid";
  chartSection.style.display = "block";
  statsSection.style.display = "grid";
  toolbar.style.display = "flex";

  renderTasks(allTasks);
  updateStats(allTasks);
  renderChart(allTasks);
}

/* =========================
   RENDER TASK
========================= */
function renderTasks(tasks) {
  const pending = document.getElementById("pendingColumn");
  const progress = document.getElementById("progressColumn");
  //const completedClass = task.status === "Completed" ? "completed-task" : "";
  const completed = document.getElementById("completedColumn");

  if (tasks.length === 0) {
    pending.innerHTML = `
    <div class="empty-state">
  <div class="empty-icon">🚀</div>

  <h3>Your workspace is empty</h3>

  <p>
    Create your first task to start
    tracking projects and productivity.
  </p>

  <button onclick="openModal()">
    Create First Task
  </button>
</div>
  `;
    return;
  }

  pending.innerHTML = "";
  progress.innerHTML = "";
  completed.innerHTML = "";

  tasks.forEach((task) => {
    const tagHTML = (task.tags || [])
      .map((tag) => `<span class="tag">${tag}</span>`)
      .join("");
    const completedClass = task.status === "Completed" ? "completed-task" : "";

    const card = `
<div
class="task-card ${completedClass}"

draggable="true"
ondragstart="dragTask(event,'${task.id}')"
ondragend="dragEnd(event)"
>

<label class="task-check-wrapper">
 <input
    type="checkbox"
    class="task-check"
    onchange="toggleComplete('${task.id}')"
    ${task.status === "Completed" ? "checked" : ""}
  >
  <span></span>
</label>

<div class="task-header">
  <div><br>
    <h3>${task.title}</h3>
    <p class="task-desc">
      ${task.description || "No description"}
    </p>
  </div>
</div>

<div class="task-info">

  <span class="task-category">
     ${task.category}
  </span>

  <span class="task-date">
    📅 ${task.due_date || "No date"}
  </span>

</div>

<div class="task-footer">

  <span class="priority ${task.priority.toLowerCase()}">
    ${task.priority}
  </span>

  <div class="tags">
    ${tagHTML}
  </div>

</div>

<div class="task-actions">
<button onclick="editTask('${task.id}')">
Edit
</button>

<button onclick="deleteTask('${task.id}')">
Delete
</button>

</div>

</div>
`;

    if (task.status === "Pending") {
      pending.innerHTML += card;
    } else if (task.status === "In Progress") {
      progress.innerHTML += card;
    } else if (task.status === "Completed") {
      completed.innerHTML += card;
    }
  });
}

/* =========================
   TOGGLE
========================= */
async function toggleComplete(id) {
  const task = allTasks.find((t) => t.id === id);

  if (!task) return;

  const newStatus = task.status === "Completed" ? "Pending" : "Completed";
  task.status = newStatus;

  renderTasks(allTasks);
  updateStats(allTasks);
  renderChart(allTasks);

  const { error } = await supabaseClient
    .from("tasks")
    .update({
      status: newStatus,
    })
    .eq("id", id);

  if (error) {
    alert(error.message);
    loadTasks();
  }
}

/* =========================
   UPDATE STAT
========================= */
function updateStats(tasks) {
  const today = new Date();
  const overdue = tasks.filter((task) => {
    if (!task.due_date) return false;

    if (task.status === "Completed") return false;

    return new Date(task.due_date) < today;
  }).length;

  const total = tasks.length;
  const pending = tasks.filter((task) => task.status === "Pending").length;
  const progress = tasks.filter((task) => task.status === "In Progress").length;
  const completed = tasks.filter((task) => task.status === "Completed").length;

  document.getElementById("totalTasks").textContent = total;
  document.getElementById("pendingTasks").textContent = pending;
  document.getElementById("progressTasks").textContent = progress;
  document.getElementById("completedTasks").textContent = completed;
  //document.getElementById("overdueTasks").textContent = overdue;
}

/* =========================
   DELETE
========================= */
async function deleteTask(id) {
  const confirmDelete = confirm("Delete this task?");

  if (!confirmDelete) return;

  const { error } = await supabaseClient.from("tasks").delete().eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  loadTasks();
}

/* =========================
   EDIT
========================= */
async function editTask(id) {
  const { data, error } = await supabaseClient
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    alert(error.message);
    return;
  }

  editingTaskId = id;

  document.getElementById("title").value = data.title;
  document.getElementById("description").value = data.description || "";
  document.getElementById("category").value = data.category;
  document.getElementById("priority").value = data.priority;
  document.getElementById("status").value = data.status;
  //document.getElementById("relatedPerson").value = data.related_person || "";
  document.getElementById("dueDate").value = data.due_date || "";
  document.getElementById("tagsInput").value = data.tags?.join(", ") || "";

  openModal();
}

/* =========================
   FILTER
========================= */
function filterTasks() {
  const keyword = document.getElementById("searchInput").value.toLowerCase();
  const status = document.getElementById("statusFilter").value;

  let filtered = allTasks.filter((task) => {
    const matchSearch =
      task.title.toLowerCase().includes(keyword) ||
      (task.description || "").toLowerCase().includes(keyword);

    const matchStatus = status === "All" || task.status === status;

    return matchSearch && matchStatus;
  });

  // SORT
  const sort = document.getElementById("sortFilter").value;

  if (sort === "newest") {
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } else if (sort === "oldest") {
    filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  } else if (sort === "priority") {
    const rank = {
      High: 3,
      Medium: 2,
      Low: 1,
    };

    filtered.sort((a, b) => rank[b.priority] - rank[a.priority]);
  }

  renderTasks(filtered);
  updateStats(filtered);
}

/* =========================
   DARK
========================= */
function toggleTheme() {
  document.body.classList.toggle("dark");

  localStorage.setItem(
    "theme",
    document.body.classList.contains("dark") ? "dark" : "light",
  );
}

/* =========================
   DOM
========================= */
document.addEventListener("DOMContentLoaded", async () => {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = "index.html";
    return;
  }

  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
  }

  loadTasks();
  loadUser();
});

/* =========================
   DRAG
========================= */
let draggedTaskId = null;

function dragTask(event, taskId) {
  draggedTaskId = taskId;

  event.target.classList.add("dragging");
}

function dragEnd(event) {
  event.target.classList.remove("dragging");
}

function allowDrop(event) {
  event.preventDefault();
}

async function dropTask(event, newStatus) {
  event.preventDefault();
  event.currentTarget.classList.remove("drag-over");

  if (!draggedTaskId) return;

  const task = allTasks.find((t) => t.id === draggedTaskId);

  if (task) {
    task.status = newStatus;

    renderTasks(allTasks);
    renderChart(allTasks);
    updateStats(allTasks);
  }

  const { error } = await supabaseClient
    .from("tasks")
    .update({
      status: newStatus,
    })
    .eq("id", draggedTaskId);

  if (error) {
    alert(error.message);
    loadTasks();
    return;
  }
  renderChart(allTasks);
  draggedTaskId = null;
}

function dragEnter(event) {
  event.preventDefault();
  event.currentTarget.classList.add("drag-over");
}

function dragLeave(event) {
  event.currentTarget.classList.remove("drag-over");
}

function allowDrop(event) {
  event.preventDefault();
}

/* =========================
   CHART
========================= */
function renderChart(tasks) {
  const canvas = document.getElementById("taskChart");

  if (!canvas) return;

  const pending = tasks.filter((t) => t.status === "Pending").length;
  const progress = tasks.filter((t) => t.status === "In Progress").length;
  const completed = tasks.filter((t) => t.status === "Completed").length;

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(canvas, {
    type: "doughnut",

    data: {
      labels: ["Pending", "In Progress", "Completed"],

      datasets: [
        {
          data: [pending, progress, completed],

          backgroundColor: ["#fbbf24", "#6366f1", "#22c55e"],

          borderWidth: 0,
        },
      ],
    },

    options: {
      responsive: true,

      plugins: {
        legend: {
          position: "bottom",
        },
      },
    },
  });
}
