
const form = document.getElementById("movie-form");
const input = document.getElementById("movie-input");
const suggestions = document.getElementById("suggestions");
const results = document.getElementById("results");
const message = document.getElementById("message");
const sectionTitle = document.getElementById("section-title");
const resultCount = document.getElementById("result-count");
const modal = document.getElementById("movie-modal");
const modalContent = document.getElementById("modal-content");
const modalPanel = modal.querySelector(".modal-panel");

let allMovies = [];
let currentView = "discover";
let lastFocused = null;
let requestVersion = 0;

const STORAGE_KEY = "moviematch-watchlist-v2";

function getWatchlist() {
  try {
    const data = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );
    return Array.isArray(data)
      ? data.filter(x => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

let watchlist = getWatchlist();

function saveWatchlist() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(watchlist)
    );
  } catch {
    message.textContent =
      "Could not save watchlist in this browser.";
  }

  document.getElementById("watch-count").textContent =
    watchlist.length;
}

saveWatchlist();

async function fetchJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    let detail = "Request failed";

    try {
      const data = await response.json();
      detail = data.detail || detail;
    } catch {}

    throw new Error(detail);
  }

  return response.json();
}

// Load all available movie titles
async function loadMovies() {
  try {
    const data = await fetchJSON("/api/movies");
    allMovies = data.movies;
  } catch (error) {
    message.textContent =
      "Unable to load movie list: " + error.message;
  }
}

function hideSuggestions() {
  suggestions.hidden = true;
  suggestions.replaceChildren();
}

function showSuggestions(query) {
  suggestions.replaceChildren();

  if (!query.trim()) {
    hideSuggestions();
    return;
  }

  const matches = allMovies
    .filter(title =>
      title.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 8);

  if (!matches.length) {
    hideSuggestions();
    return;
  }

  matches.forEach(title => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "suggestion";
    button.setAttribute("role", "option");
    button.textContent = title;

    button.addEventListener("click", () => {
      input.value = title;
      hideSuggestions();
      recommend(title);
    });

    suggestions.appendChild(button);
  });

  suggestions.hidden = false;
}

input.addEventListener("input", () => {
  showSuggestions(input.value);
});

input.addEventListener("keydown", event => {
  if (event.key === "Escape") hideSuggestions();

  if (event.key === "ArrowDown" && !suggestions.hidden) {
    event.preventDefault();
    suggestions.querySelector("button")?.focus();
  }
});

suggestions.addEventListener("keydown", event => {
  const buttons = [...suggestions.querySelectorAll("button")];
  const index = buttons.indexOf(document.activeElement);

  if (event.key === "ArrowDown") {
    event.preventDefault();
    buttons[(index + 1) % buttons.length]?.focus();
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (index === 0) input.focus();
    else buttons[index - 1]?.focus();
  }

  if (event.key === "Escape") {
    hideSuggestions();
    input.focus();
  }
});

document.addEventListener("click", event => {
  if (!event.target.closest(".search-wrap")) {
    hideSuggestions();
  }
});

function showSkeletons() {
  results.replaceChildren();

  for (let i = 0; i < 5; i++) {
    const skeleton = document.createElement("div");
    skeleton.className = "skeleton";
    results.appendChild(skeleton);
  }
}

async function getMetadata(title) {
  return fetchJSON(
    "/api/metadata?title=" + encodeURIComponent(title)
  );
}

// Fetch recommendations from your EXISTING ML API
async function recommend(movie) {
  const version = ++requestVersion;
  currentView = "discover";

  setActiveNav("home-btn");
  hideSuggestions();

  sectionTitle.textContent = "Because you liked " + movie;
  resultCount.textContent = "";
  message.textContent = "Finding your next favorite movies...";
  showSkeletons();

  try {
    const data = await fetchJSON(
      "/api/recommend?movie=" + encodeURIComponent(movie)
    );

    if (version !== requestVersion) return;

    sectionTitle.textContent =
      "Because you liked " + data.movie;

    await renderMovies(data.recommendations, version);

    if (version === requestVersion) {
      message.textContent =
        "Handpicked by your recommendation algorithm.";
    }
  } catch (error) {
    if (version !== requestVersion) return;
    results.replaceChildren();
    message.textContent = error.message;
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();
  const movie = input.value.trim();
  if (movie) recommend(movie);
});

async function renderMovies(titles, version) {
  results.replaceChildren();
  resultCount.textContent = titles.length + " movies";

  if (!titles.length) {
    message.textContent = "No movies to display yet.";
    return;
  }

  showSkeletons();

  // Fetch metadata concurrently
  const metadata = await Promise.all(
    titles.map(async title => {
      try {
        return await getMetadata(title);
      } catch {
        return {
          title,
          poster: null,
          rating: null,
          year: null
        };
      }
    })
  );

  if (version !== requestVersion) return;

  results.replaceChildren();

  metadata.forEach((movie, index) => {
    results.appendChild(
      createMovieCard(titles[index], movie)
    );
  });
}

function createMovieCard(title, movie) {
  const card = document.createElement("article");
  card.className = "movie-card";

  const posterWrap = document.createElement("div");
  posterWrap.className = "poster-wrap";

  if (movie.poster) {
    const img = document.createElement("img");
    img.src = movie.poster;
    img.alt = "Poster for " + title;
    img.loading = "lazy";

    img.onerror = () => {
      posterWrap.replaceChildren();
      addPosterFallback(posterWrap, title);
    };

    posterWrap.appendChild(img);
  } else {
    addPosterFallback(posterWrap, title);
  }

  const body = document.createElement("div");
  body.className = "card-body";

  const heading = document.createElement("div");
  heading.className = "card-title";
  heading.textContent = title;

  const meta = document.createElement("div");
  meta.className = "card-meta";

  const rating = movie.rating != null
    ? Number(movie.rating).toFixed(1)
    : "N/A";

  meta.textContent =
    (movie.year || "Movie") + "  •  ★ " + rating;

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const detailsBtn = document.createElement("button");
  detailsBtn.className = "small-btn";
  detailsBtn.textContent = "Details";
  detailsBtn.addEventListener("click", () => {
    openDetails(title);
  });

  const saveBtn = document.createElement("button");
  saveBtn.className = "small-btn";

  function updateSaveButton() {
    saveBtn.textContent = watchlist.includes(title)
      ? "✓ Saved"
      : "+ Save";
  }

  updateSaveButton();

  saveBtn.addEventListener("click", () => {
    toggleWatchlist(title);
    updateSaveButton();

    if (currentView === "watchlist") {
      showWatchlist();
    }
  });

  actions.append(detailsBtn, saveBtn);
  body.append(heading, meta, actions);
  card.append(posterWrap, body);

  return card;
}

function addPosterFallback(container, title) {
  const fallback = document.createElement("div");
  fallback.className = "poster-fallback";
  fallback.textContent = "🎬 " + title;
  container.appendChild(fallback);
}

function toggleWatchlist(title) {
  if (watchlist.includes(title)) {
    watchlist = watchlist.filter(x => x !== title);
  } else {
    watchlist.push(title);
  }

  saveWatchlist();
}

function setActiveNav(id) {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.id === id);
  });
}

async function showWatchlist() {
  const version = ++requestVersion;
  currentView = "watchlist";
  setActiveNav("watchlist-btn");

  sectionTitle.textContent = "My Watchlist";
  message.textContent = watchlist.length
    ? "Movies you've saved for later."
    : "Your watchlist is empty. Save a movie to begin.";

  results.replaceChildren();
  resultCount.textContent = "";

  if (watchlist.length) {
    await renderMovies([...watchlist], version);
  }
}

document.getElementById("watchlist-btn")
  .addEventListener("click", showWatchlist);

document.getElementById("home-btn")
  .addEventListener("click", () => {
    currentView = "discover";
    setActiveNav("home-btn");
    sectionTitle.textContent = "Your recommendations";
    message.textContent = "Search for a movie to get started.";
    resultCount.textContent = "";
    results.replaceChildren();
    ++requestVersion;
    input.focus();
  });

// Movie details modal
async function openDetails(title) {
  lastFocused = document.activeElement;
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  modalContent.replaceChildren();
  modalContent.textContent = "Loading movie details...";
  modalPanel.focus();

  try {
    const movie = await getMetadata(title);

    if (modal.hidden) return;

    modalContent.replaceChildren();

    if (movie.poster) {
      const poster = document.createElement("img");
      poster.className = "modal-poster";
      poster.src = movie.poster;
      poster.alt = "Poster for " + title;
      modalContent.appendChild(poster);
    }

    const heading = document.createElement("h2");
    heading.id = "modal-title";
    heading.textContent = movie.title || title;

    const meta = document.createElement("p");
    meta.textContent =
      (movie.year || "Year unknown") +
      "  •  ★ " +
      (movie.rating != null
        ? Number(movie.rating).toFixed(1) + "/10"
        : "Not rated");

    const overview = document.createElement("p");
    overview.textContent = movie.overview;

    modalContent.append(heading, meta, overview);

    if (movie.trailer) {
      const link = document.createElement("a");
      link.href = movie.trailer;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "▶ Watch Trailer";
      modalContent.appendChild(link);
    }
  } catch (error) {
    modalContent.textContent =
      "Unable to load details: " + error.message;
  }
}

function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = "";
  lastFocused?.focus();
}

document.getElementById("close-modal")
  .addEventListener("click", closeModal);

modal.querySelector("[data-close]")
  .addEventListener("click", closeModal);

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !modal.hidden) {
    closeModal();
  }

  // Keep keyboard focus inside the open dialog
  if (event.key === "Tab" && !modal.hidden) {
    const elements = [
      ...modalPanel.querySelectorAll(
        'button:not([disabled]), a[href]'
      )
    ];

    const first = elements[0];
    const last = elements[elements.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      document.activeElement === last
    ) {
      event.preventDefault();
      first.focus();
    }
  }
});

loadMovies();
