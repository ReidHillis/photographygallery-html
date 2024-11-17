import express, { json } from "express";
import sqlite3 from "sqlite3";
const { Database } = sqlite3;
import cors from "cors";

const db = new Database("db.sqlite");

const server = express();
server.use(cors());
server.use(json({ limit: "50mb" }));

db.run(`CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    title TEXT UNIQUE NOT NULL,
    author TEXT NOT NULL,
    likes INT NOT NULL,
    photoData TEXT NOT NULL)`);

server.post("/uploadPhoto", (req, res) => {
  let data = req.body;

  let statement = db.prepare(
    `INSERT INTO photos(title, author, likes, photoData) VALUES(?, ?, ?, ?)`
  );

  statement.run(data.title, data.author, 0, data.photoData, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error uploading photo");
    }
    return res.sendStatus(201);
  });
});

server.get("/getPhoto", (req, res) => {
  let data = req.query;
  let statement = db.prepare(`SELECT * FROM photos WHERE id = ?`);

  statement.get([data.id], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error retrieving photo");
    }

    if (row) {
      return res.status(200).send(row);
    } else {
      return res.status(404).send("Photo not found");
    }
  });
});

server.get("addLike", (req, res) => {
  let data = req.query;
  let statement = db.prepare(
    `UPDATE photos SET likes = likes + 1 WHERE id = ?`
  );
  db.run(statement, [data.id], (err) => {
    if (err) {
      console.error(err);
      return res.sendStatus(500).send("Error updating likes");
    } else {
      return res.sendStatus(204).send("Likes updated");
    }
  });
});

server.get("/deletePhoto", (req, res) => {
  let data = req.query;
  let statement = db.prepare(`DELETE FROM photos WHERE id = ?`);
  statement.run([data.id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error deleting photo");
    }

    return res.sendStatus(204);
  });
});

server.listen(3000, () => {
  console.log("Server listening at localhost:3000");
});
