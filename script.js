
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, set, remove, update, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";


const firebaseConfig = {
  apiKey: "AIzaSyCTb5kzbxcJFzmMPYC-emlopButmUeWR7A",
  authDomain: "readinglist-68f64.firebaseapp.com",
  databaseURL: "https://readinglist-68f64-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "readinglist-68f64",
  storageBucket: "readinglist-68f64.firebasestorage.app",
  messagingSenderId: "875228807411",
  appId: "1:875228807411:web:d23b9a46994ddeb14b3786"
};


const app = initializeApp(firebaseConfig);
const db = getDatabase(app);


class Book {
  constructor(id, title, author, favorite, createdAt) {
    this.id = id;
    this.title = title;
    this.author = author;
    this.favorite = favorite;
    this.createdAt = createdAt;
  }
  toggleFavorite() {
    this.favorite = !this.favorite;
  }
}


const form = document.getElementById("book-form");
const list = document.getElementById("book-list");
const filterSelect = document.getElementById("filter");
const sortSelect = document.getElementById("sort");

const title = document.getElementById("title");
const author = document.getElementById("author");
const favorite = document.getElementById("favorite");

let books = [];
const booksRef = ref(db, 'books');


onValue(booksRef, (snapshot) => {
  const data = snapshot.val() || {};
  books = Object.entries(data).map(([id, b]) => new Book(
    id,
    b.title || "",
    b.author || "",
    b.favorite || false,
    b.createdAt || Date.now()
  ));
  render();
});


form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const newRef = push(booksRef);
  await set(newRef, {
    title: title.value,
    author: author.value,
    favorite: favorite.checked,
    createdAt: Date.now()
  });
  form.reset();
});


async function deleteBook(id) {
  await remove(ref(db, 'books/' + id));
}


async function toggleFavorite(book) {
  book.toggleFavorite();
  await update(ref(db, 'books/' + book.id), { favorite: book.favorite });
}


function filterBooks(list, filter) {
  return filter === "favorites" ? list.filter(b => b.favorite) : list;
}

function sortBooks(list, sort) {
  const sorted = [...list];
  switch (sort) {
    case "title-asc": return sorted.sort((a,b)=>a.title.localeCompare(b.title));
    case "title-desc": return sorted.sort((a,b)=>b.title.localeCompare(a.title));
    case "author-asc": return sorted.sort((a,b)=>a.author.localeCompare(b.author));
    case "author-desc": return sorted.sort((a,b)=>b.author.localeCompare(a.author));
    case "added-asc": return sorted.sort((a,b)=>a.createdAt - b.createdAt);
    case "added-desc": return sorted.sort((a,b)=>b.createdAt - a.createdAt);
    default: return sorted;
  }
}


function render() {
  list.innerHTML = "";
  const filtered = filterBooks(books, filterSelect.value);
  const sorted = sortBooks(filtered, sortSelect.value);

  sorted.forEach(book => {
    const li = document.createElement("li");
    li.className = book.favorite ? "favorite" : "";

    li.innerHTML = `
      <div>
        <strong>${book.title}</strong><br>
        <em>${book.author}</em>
      </div>
      <div class="actions">
        <button>⭐</button>
        <button>🗑</button>
      </div>
    `;

    li.querySelector("button:nth-child(1)")
      .addEventListener("click", () => toggleFavorite(book));

    li.querySelector("button:nth-child(2)")
      .addEventListener("click", () => deleteBook(book.id));

    list.appendChild(li);
  });
}


filterSelect.addEventListener("change", render);
sortSelect.addEventListener("change", render);
