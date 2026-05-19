let editingTaskId = null;
let allTasks = [];

// User
async function loadUser() {
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  if (user) {
    document.getElementById("userEmail").textContent = user.email;
  }
}

// Logout
async function logout() {
  await supabaseClient.auth.signOut();

  window.location.href = "index.html";
}

// Open/Close Modal
function openModal() {
  document.getElementById("taskModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("taskModal").style.display = "none";
}

// Save Task
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
  const relatedPerson = document.getElementById("relatedPerson").value;
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
        related_person: relatedPerson,
        due_date: dueDate,
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
        related_person: relatedPerson,
        due_date: dueDate,
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
  document.getElementById("relatedPerson").value = "";
  document.getElementById("dueDate").value = "";

  closeModal();
  loadTasks();
}

// Load Task
async function loadTasks() {
  const { data, error } = await supabaseClient
    .from("tasks")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.log(error);
    return;
  }

  allTasks = data;

  renderTasks(allTasks);

  updateStats(allTasks);
}

// Render Task
function renderTasks(tasks) {
  const pending = document.getElementById("pendingColumn");

  const progress = document.getElementById("progressColumn");
  //const completedClass = task.status === "Completed" ? "completed-task" : "";
  const completed = document.getElementById("completedColumn");

  pending.innerHTML = "";
  progress.innerHTML = "";
  completed.innerHTML = "";

  tasks.forEach((task) => {
    const completedClass = task.status === "Completed" ? "completed-task" : "";

    const card = `
<div
class="task-card ${completedClass}"

draggable="true"
ondragstart="dragTask(event,'${task.id}')"
ondragend="dragEnd(event)"
>

<h3>${task.title}</h3>

<p>${task.description || ""}</p>

<p>${task.due_date || "-"}</p>

<span class="${task.priority.toLowerCase()}">
${task.priority}
</span>

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

// Update Task
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
  document.getElementById("overdueTasks").textContent = overdue;
}

//Delete Task
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

//Edit Task
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

  document.getElementById("relatedPerson").value = data.related_person || "";

  document.getElementById("dueDate").value = data.due_date || "";

  openModal();
}

// Filter Task
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

// Dark Mode
function toggleTheme() {
  document.body.classList.toggle("dark");

  localStorage.setItem(
    "theme",
    document.body.classList.contains("dark") ? "dark" : "light",
  );
}

// DOM
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

// Drag
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

  draggedTaskId = null;
}

function dragEnter(event) {
  event.currentTarget.classList.add("drag-over");
}

function dragLeave(event) {
  event.currentTarget.classList.remove("drag-over");
}
