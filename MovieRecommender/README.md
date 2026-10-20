# MovieMatch — Movie Recommendation System

A content-based movie recommendation web application built using Python, FastAPI, and JavaScript. It suggests movies based on their similarity to a selected movie and displays additional information such as posters, ratings, release years, and descriptions.

## Features

- **Movie Recommendations:** Get five similar movie suggestions based on a selected movie.
- **Movie Search:** Search for movies from the available dataset.
- **Movie Details:** View posters, ratings, release years, and descriptions.
- **Trailer Integration:** Access available YouTube trailers through TMDB.
- **Metadata Caching:** Store fetched movie details locally to reduce repeated API requests.
- **API Error Handling:** Retry requests when temporary network or server errors occur.

## Tech Stack

| Component | Technology |
|---|---|
| Programming Language | Python |
| Backend | FastAPI |
| Machine Learning | Scikit-learn, NumPy, Pandas |
| Frontend | HTML, CSS, JavaScript |
| Movie Metadata | TMDB API |
| Server | Uvicorn |

## How It Works

The recommendation system uses a content-based filtering approach.

1. Movie features are processed into numerical representations using text vectorization.
2. Cosine similarity is used to measure similarity between movies.
3. When a user selects a movie, the system retrieves its similarity scores.
4. The five most similar movies are returned as recommendations.
5. TMDB provides additional details such as posters, ratings, and descriptions.

## Project Structure

```text
MovieRecommender/
├── assets/
│   ├── movies.csv
│   └── similarity.npy
├── backend/
│   └── main.py
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── .env
└── README.md
```

The `.env` file is used locally for API credentials and should not be committed to GitHub.

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/ADIT700915/MyProjects.git
cd MyProjects/MovieRecommender
```

### 2. Install dependencies

Python 3.12 is recommended.

```bash
py -3.12 -m pip install fastapi uvicorn numpy pandas httpx python-dotenv scikit-learn
```

### 3. Configure TMDB API access

Create a `.env` file in the project directory and add your TMDB API Read Access Token:

```env
TMDB_READ_TOKEN=your_tmdb_read_access_token
```

You can obtain a token from [The Movie Database](https://www.themoviedb.org/settings/api).

### 4. Run the application

```bash
py -3.12 -m uvicorn backend.main:app --reload
```

Open the application in your browser:

```text
http://127.0.0.1:8000
```

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/movies` | Returns available movie titles |
| `GET /api/recommend?movie=Avatar` | Returns similar movies |
| `GET /api/metadata?title=Avatar` | Returns movie details from TMDB or the local cache |

## Future Improvements

- Improve the overall UI and mobile responsiveness.
- Add movie detail popups.
- Introduce a personal watchlist.
- Improve search and filtering.
- Deploy the application online.

## Acknowledgements

Movie metadata and images are provided through [TMDB](https://www.themoviedb.org/). This project uses the TMDB API but is not endorsed or certified by TMDB.

## Author

Developed by [ADIT700915](https://github.com/ADIT700915).