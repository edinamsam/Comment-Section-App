const commentsContainer = document.querySelector(".comments");

let data;

fetch("./data.json")
  .then((res) => res.json())
  .then((json) => {
    data = json;
    renderComments(data.comments);
  })
  .catch((err) => console.error(err));

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
        <div class="comment-header>
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
  const btn = e.target.closest(".vote-btn");
  if (!btn) return;

  const commentEl = e.target.closest(".comment");
  const id = Number(commentEl.dataset.id);

  const delta = btn.classList.contains("plus") ? 1 : -1;
  updateScore(id, delta);
});

function updateScore(id, delta) {
  const comment = findCommentById(data.comments, id);
  if (!comment) return;

  comment.score = Math.max(0, comment.score + delta);

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
