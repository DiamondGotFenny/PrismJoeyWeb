# PrismJoey

PrismJoey is a full-stack application with a FastAPI backend and a React frontend.

## Project Structure

- `backend/`: Contains the FastAPI backend application.
- `frontend/`: Contains the React frontend application.

## Getting Started

### Backend

1. Navigate to the `backend` directory: `cd backend`
2. (If not done already) Create a virtual environment: `python -m venv venv`
3. Activate the virtual environment: `source venv/bin/activate` (on macOS/Linux) or `venv\Scripts\activate` (on Windows)
4. Install dependencies: `pip install -r requirements.txt` (Note: a requirements.txt file will need to be generated)
5. Run the development server: `uvicorn main:app --reload`

### Frontend

1. Navigate to the `frontend` directory: `cd frontend`
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`

## Linting and Formatting

### Backend

- **Black** and **isort** are used for formatting.
- **MyPy** is used for static type checking.

### Frontend

- **ESLint** and **Prettier** are used for linting and formatting.
  - To lint: `npm run lint` (Note: this script will need to be added to package.json)
  - To format: `npm run format` (Note: this script will need to be added to package.json)
