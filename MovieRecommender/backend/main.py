
from pathlib import Path
import json
import logging
import os
import threading
import time

import httpx
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles



ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env", override=True)

app = FastAPI(title="MovieMatch API")

TMDB_TOKEN = os.getenv("TMDB_READ_TOKEN", "").strip()
TMDB_URL = "https://api.themoviedb.org/3"

logger = logging.getLogger("uvicorn.error")

CACHE_FILE = ROOT / "assets" / "metadata_cache.json"
cache_lock = threading.Lock()




movies = pd.read_csv(ROOT / "assets" / "movies.csv")

titles = movies["title"].fillna("").astype(str).tolist()

similarity = np.load(
    ROOT / "assets" / "similarity.npy",
    mmap_mode="r"
)

if similarity.shape != (len(titles), len(titles)):
    raise RuntimeError(
        "Movie data and similarity matrix do not match"
    )

title_index = {}

for i, title in enumerate(titles):
    title_index.setdefault(title.casefold(), i)




def load_cache():
    if not CACHE_FILE.exists():
        return {}

    try:
        with CACHE_FILE.open("r", encoding="utf-8") as file:
            data = json.load(file)

        if not isinstance(data, dict):
            raise ValueError("Invalid cache structure")

        return data

    except (OSError, ValueError) as exc:
        logger.warning(
            "Could not load metadata cache: %s",
            type(exc).__name__
        )
        return {}


metadata_cache = load_cache()


def save_cache():
    """
    Save metadata safely using a temporary file.
    """
    CACHE_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    temporary_file = CACHE_FILE.with_suffix(".tmp")

    with temporary_file.open(
        "w",
        encoding="utf-8"
    ) as file:
        json.dump(
            metadata_cache,
            file,
            ensure_ascii=False,
            indent=2
        )

    temporary_file.replace(CACHE_FILE)



@app.get("/api/movies")
def get_movies():
    return {"movies": titles}



@app.get("/api/recommend")
def recommend(movie: str):
    index = title_index.get(
        movie.strip().casefold()
    )

    if index is None:
        raise HTTPException(
            status_code=404,
            detail="Movie not found"
        )

    scores = similarity[index]

    ranked = np.argsort(
        -scores,
        kind="stable"
    )

    recommendations = [
        titles[int(i)]
        for i in ranked
        if int(i) != index
    ][:5]

    return {
        "movie": titles[index],
        "recommendations": recommendations
    }




def tmdb_get(path, params=None):
    if not TMDB_TOKEN:
        raise HTTPException(
            status_code=503,
            detail="TMDB_READ_TOKEN is missing"
        )

    url = f"{TMDB_URL}/{path.lstrip('/')}"

    headers = {
        "Authorization": f"Bearer {TMDB_TOKEN}",
        "accept": "application/json"
    }

    for attempt in range(3):
        try:
            with httpx.Client(
                timeout=15.0,
                follow_redirects=True
            ) as client:

                response = client.get(
                    url,
                    headers=headers,
                    params=params
                )

                response.raise_for_status()
                return response.json()

        except httpx.HTTPStatusError as exc:
            status = exc.response.status_code

            logger.warning(
                "TMDB HTTP %s for %s",
                status,
                path
            )

            if status not in (
                429, 500, 502, 503, 504
            ):
                break

        except httpx.RequestError as exc:
            logger.warning(
                "TMDB request attempt %s/3 failed for %s: %s",
                attempt + 1,
                path,
                type(exc).__name__
            )

        except ValueError:
            logger.warning(
                "TMDB returned invalid JSON for %s",
                path
            )
            break

        if attempt < 2:
            time.sleep(attempt + 1)

    raise HTTPException(
        status_code=502,
        detail="Movie metadata provider is temporarily unavailable"
    )



def fetch_metadata_from_tmdb(title):
    data = tmdb_get(
        "/search/movie",
        {
            "query": title,
            "include_adult": "false"
        }
    )

    results = data.get("results", [])

    if not results:
        return {
            "id": None,
            "title": title,
            "poster": None,
            "backdrop": None,
            "rating": None,
            "year": None,
            "overview": "Movie details unavailable.",
            "trailer": None
        }

    movie = next(
        (
            item for item in results
            if item.get("title", "").casefold()
            == title.casefold()
        ),
        results[0]
    )

    movie_id = movie["id"]

    details = tmdb_get(
        f"/movie/{movie_id}",
        {"append_to_response": "videos"}
    )

    videos = details.get(
        "videos", {}
    ).get("results", [])

    trailer = next(
        (
            video for video in videos
            if video.get("site") == "YouTube"
            and video.get("type") == "Trailer"
        ),
        None
    )

    poster_path = details.get("poster_path")
    backdrop_path = details.get("backdrop_path")

    return {
        "id": movie_id,
        "title": details.get("title", title),
        "poster": (
            f"https://image.tmdb.org/t/p/w500{poster_path}"
            if poster_path else None
        ),
        "backdrop": (
            f"https://image.tmdb.org/t/p/w1280{backdrop_path}"
            if backdrop_path else None
        ),
        "rating": details.get("vote_average"),
        "year": (
            details.get("release_date") or ""
        )[:4],
        "overview": (
            details.get("overview")
            or "No overview available."
        ),
        "trailer": (
            f"https://www.youtube.com/watch?v={trailer['key']}"
            if trailer else None
        )
    }


def get_metadata(title):
    cache_key = title.strip().casefold()

    # Return previously saved metadata
    with cache_lock:
        cached = metadata_cache.get(cache_key)

    if cached is not None:
        logger.info(
            "Metadata cache HIT: %s",
            title
        )
        return cached

    logger.info(
        "Metadata cache MISS: %s",
        title
    )

    # Fetch new metadata from TMDB
    metadata = fetch_metadata_from_tmdb(title)

    # Save only successfully resolved movies
    if metadata.get("id") is not None:
        with cache_lock:
            metadata_cache[cache_key] = metadata

            try:
                save_cache()
            except OSError as exc:
                logger.warning(
                    "Could not save metadata cache: %s",
                    type(exc).__name__
                )

    return metadata




@app.get("/api/metadata")
def movie_metadata(
    title: str = Query(
        min_length=1,
        max_length=200
    )
):
    return get_metadata(title.strip())



app.mount(
    "/",
    StaticFiles(
        directory=ROOT / "frontend",
        html=True
    ),
    name="frontend"
)
