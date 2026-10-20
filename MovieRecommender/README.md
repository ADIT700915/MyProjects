# Movie Recommendation System 🎬

This is a movie recommendation website I built while learning machine learning and working with APIs.

The idea is simple: you select a movie you like, and the website suggests 5 similar movies. It also shows movie posters, ratings, descriptions, and trailers when available.

## How it works

I used content-based filtering to recommend movies.

First, I worked with a movie dataset and processed the movie information using Python. Then I used CountVectorizer and cosine similarity to find how similar two movies are.

When someone searches for a movie, the system finds it in the dataset and recommends the 5 movies with the highest similarity scores.

I also connected the TMDB API to get movie posters and other details, since the original dataset doesn't contain all of that information.

## Tech Stack

- **Python** – for the recommendation logic
- **Pandas, NumPy, Scikit-learn** – for data processing and similarity calculation
- **FastAPI** – for connecting the recommendation system with the website
- **HTML, CSS, JavaScript** – for the frontend
- **TMDB API** – for movie posters, ratings, descriptions, and trailers

## Features

- Search for a movie
- Get 5 similar movie recommendations
- View movie posters and details
- Watch available trailers
- Cache movie details to avoid making the same API request again

## How to run it

**1. Clone the repository**

```bash
git clone https://github.com/ADIT700915/MyProjects.git
cd MyProjects/MovieRecommender
```

**2. Install the required libraries**

```bash
py -3.12 -m pip install fastapi uvicorn pandas numpy scikit-learn httpx python-dotenv
```

**3. Set up the TMDB API**

Create a `.env` file inside the `MovieRecommender` folder and add:

```env
TMDB_READ_TOKEN=your_token_here
```

You can get the token from [TMDB](https://www.themoviedb.org/settings/api).

**4. Run the project**

```bash
py -3.12 -m uvicorn backend.main:app --reload
```

Now open `http://127.0.0.1:8000` in your browser.

## Things I learned

While building this project, I got to understand how content-based recommendation systems work and how a machine learning model can be connected to a web application.

I also learned about working with APIs, handling API errors, and using caching to avoid fetching the same movie information repeatedly.

## What's next?

I'm planning to improve the UI, make the website more responsive, and maybe add a watchlist feature.

---

Built as a learning project using Python, Machine Learning, and web development.

Movie information and images are provided by TMDB. This project is not endorsed or certified by TMDB.