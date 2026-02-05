const commentsContainer = document.querySelector(".comments");
const modal = document.getElementById("delete-modal");
const cancelBtn = document.querySelector(".cancel-btn");
const confirmBtn = document.querySelector(".confirm-btn");
const STORAGE_KEY = "comments-data";

let data;
let deleteTargetId = null;

const storedData = localStorage.getItem(STORAGE_KEY);

if (storedData) {
  data = JSON.parse(storedData);
  renderComments(data.comments);
} else {
  fetch("./data.json")
    .then((res) => res.json())
    .then((json) => {
      data = json;
      saveToStorage();
      renderComments(data.comments);
    })
    .catch((err) => console.error(err));
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function renderComments(comments) {
  commentsContainer.innerHTML = "";

  comments.forEach((comment) => {
    const commentEl = createComment(comment);
    commentsContainer.appendChild(commentEl);

    //render replies(if any)
    if (comment.replies.length > 0) {
      const repliesWrapper = document.createElement("div");
      repliesWrapper.className = "replies";

      comment.replies.forEach((reply) => {
        const replyEl = createComment(reply, true);
        repliesWrapper.appendChild(replyEl);
      });

      commentsContainer.appendChild(repliesWrapper);
    }
  });
}

function createComment(comment, isReply = false) {
  const div = document.createElement("div");
  div.className = isReply ? "comment reply" : "comment";
  div.dataset.id = comment.id;

  const isCurrentUser = comment.user.username === data.currentUser.username;

  div.innerHTML = `
      <div class="vote-box">
        <button class="vote-btn plus">+</button>
        <span>${comment.score}</span>
        <button class="vote-btn minus">-</button>
      </div>

      <div class="comment-body">
        <div class="comment-header">
          <img src="${comment.user.image.png}" alt="${comment.user.username}" >
          <strong>${comment.user.username}</strong>
          ${isCurrentUser ? `<span class="you-badge">you</span>` : ""}
          <span class="time">${comment.createdAt}</span>
          <div class="actions">
            ${
              isCurrentUser
                ? `<button class="delete">Delete</button>
                     <button class="edit">Edit</button>`
                : `<button class="reply">Reply</button>`
            }
          </div>
        </div>
        <p class="comment-text">
            ${
              comment.replyingTo
                ? `<span class="mention">@${comment.replyingTo}</span>`
                : ""
            }
            ${comment.content}
          </p>
      </div>
    `;

  return div;
}

commentsContainer.addEventListener("click", (e) => {
  const voteBtn = e.target.closest(".vote-btn");
  if (voteBtn) {
    const commentEl = voteBtn.closest(".comment");
    const id = Number(commentEl.dataset.id);
    const delta = voteBtn.classList.contains("plus") ? 1 : -1;
    updateScore(id, delta);
    return;
  }

  const replyBtn = e.target.closest(".reply");
  if (replyBtn) {
    const commentEl = replyBtn.closest(".comment");
    const id = Number(commentEl.dataset.id);
    //Remove any existing reply form
    document.querySelectorAll(".reply-form").forEach((f) => f.remove());

    const username = commentEl.querySelector(
      ".comment-header strong",
    ).textContent;

    const form = createReplyForm(username);
    commentEl.after(form);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submitReply(id, form, username);
    });
  }

  const editBtn = e.target.closest(".edit");
  if (editBtn) {
    const commentEl = editBtn.closest(".comment");
    const id = Number(commentEl.dataset.id);

    toggleEdit(commentEl, id, editBtn);
  }

  const deleteBtn = e.target.closest(".delete");
  if (deleteBtn) {
    const commentEl = deleteBtn.closest(".comment");
    deleteTargetId = Number(commentEl.dataset.id);

    modal.classList.remove("hidden");
  }
});

cancelBtn.addEventListener("click", () => {
  deleteTargetId = null;
  modal.classList.add("hidden");
});

confirmBtn.addEventListener("click", () => {
  if (deleteTargetId === null) return;

  deleteCommentById(data.comments, deleteTargetId);
  deleteTargetId = null;

  modal.classList.add("hidden");
  renderComments(data.comments);
});

function updateScore(id, delta) {
  const comment = findCommentById(data.comments, id);
  if (!comment) return;

  comment.score = Math.max(0, comment.score + delta);
  saveToStorage();
  renderComments(data.comments);
}

function findCommentById(comments, id) {
  for (const comment of comments) {
    if (comment.id === id) return comment;

    if (comment.replies?.length) {
      const found = findCommentById(comment.replies, id);
      if (found) return found;
    }
  }
  return null;
}

function createReplyForm(replyingTo) {
  const form = document.createElement("form");
  form.className = "reply-form";

  form.innerHTML = `
    <textarea required>@${replyingTo} </textarea>
    <button type="submit">REPLY</button>
  `;

  return form;
}

function submitReply(parentId, form, replyingTo) {
  const textarea = form.querySelector("textarea");
  const content = textarea.value.replace(`@${replyingTo}`, "").trim();

  if (!content) return;

  const parent = findCommentById(data.comments, parentId);
  if (!parent) return;

  const newReply = {
    id: Date.now(),
    content,
    createdAt: "Just now",
    score: 0,
    replyingTo,
    user: data.currentUser,
  };

  parent.replies.push(newReply);
  saveToStorage();
  renderComments(data.comments);
}

function toggleEdit(commentEl, id, editBtn) {
  const comment = findCommentById(data.comments, id);
  if (!comment) return;

  const textEl = commentEl.querySelector(".comment-text");

  //If already editing ➡️ update
  if (editBtn.textContent === "Update") {
    const textarea = textEl.querySelector("textarea");
    const newContent = textarea.value.trim();

    if (!newContent) return;

    comment.content = newContent;
    saveToStorage();
    renderComments(data.comments);
    return;
  }

  //Enter edit mode
  const textarea = document.createElement("textarea");
  textarea.value = comment.content;
  textarea.className = "edit-textarea";

  textEl.innerHTML = "";
  textEl.appendChild(textarea);

  editBtn.textContent = "Update";
}

function deleteCommentById(comments, id) {
  const index = comments.findIndex((c) => c.id === id);
  if (index !== -1) {
    comments.splice(index, 1);
    return true;
  }

  for (const comment of comments) {
    if (comment.replies?.length) {
      const deleted = deleteCommentById(comment.replies, id);
      saveToStorage();
      if (deleted) return true;
    }
  }

  return false;
}

modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.classList.add("hidden");
    deleteTargetId = null;
  }
});
