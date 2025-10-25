# CSV to JSON Converter API

A Node.js application to parse a CSV file, convert rows to JSON with nested properties, and upload the data in batches to a PostgreSQL database.

## Quick Start

### Clone the Repository
git clone https://github.com/NehaVishwakarma26/csv_to_postgres_api.git
cd csv_to_postgres_api

### Install Dependencies
npm install

### Create .env File
Create a file named `.env` in the root of the project with the following content:

# Server port
PORT=3000

# Path to the input CSV file
CSV_FILE_PATH=./data/users.csv

# Postgres Connection
DB_USER=postgres
DB_HOST=localhost
DB_DATABASE=csv_import_service
DB_PASSWORD=your_password
DB_PORT=5432

### Run the Application
node index.js

## Functionality
When the application starts (or when the `/upload` endpoint is triggered), it will:  
- Read the CSV file specified in `CSV_FILE_PATH`  
- Parse each row, handling nested properties (e.g., `name.firstName`)  
- Insert the data in batches into the PostgreSQL database  
- Generate an age distribution report in the server console once the import is complete
