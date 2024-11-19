import express, { json } from "express";
import sqlite3 from "sqlite3";
const { Database } = sqlite3;
import cors from "cors";
import bcrypt from "bcrypt";
import crypto from "crypto";

const saltRounds = 10;

const db = new Database("db.sqlite");

const server = express();
server.use(cors());
server.use(json({ limit: "50mb" }));

db.run(`CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    title TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    author TEXT NOT NULL,
    likes INT NOT NULL,
    comments TEXT NOT NULL,
    photoData TEXT NOT NULL)`);

db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL
  )`);

let sessions = {};
let make_session = (username) => {
  // sessions should expire
  let length = 16;
  let token = crypto.randomBytes(length).toString("hex");
  sessions[token] = username;
  return token;
};

server.post("/uploadPhoto", (req, res) => {
  let data = req.body;
  if (!(data.token in sessions)) {
    console.log("token was " + data.token);
    console.log("list of tokens " + sessions);
    return res.status(401).send("invalid token");
  }

  let author = sessions[data.token];

  let statement = db.prepare(
    `INSERT INTO photos(title, description, author, likes, comments,  photoData) VALUES(?, ?, ?, ?, ?, ?)`
  );

  statement.run(
    data.title,
    data.description,
    author,
    0,
    "",
    data.photoData,
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Error uploading photo");
      }
      return res.status(201).send("photo uploaded");
    }
  );
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

server.get("/addLike", (req, res) => {
  // should have database for posts users have liked
  let data = req.query;

  if (!(data.token in sessions)) {
    return res.status(401).send("invalid token");
  }

  let statement = db.prepare(
    `UPDATE photos SET likes = likes + 1 WHERE id = ?`
  );
  statement.run([data.id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error updating likes");
    } else {
      return res.status(204).send("Likes updated");
    }
  });
});

server.get("/removeLike", (req, res) => {
  let data = req.query;

  if (!(data.token in sessions)) {
    return res.status(401).send("invalid token");
  }

  let statement = db.prepare(
    `UPDATE photos SET likes = likes - 1 WHERE id = ?`
  );
  statement.run([data.id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error updating likes");
    } else {
      return res.status(204).send("Likes updated");
    }
  });
});

server.get("/deletePhoto", (req, res) => {
  let data = req.query;

  if (!(data.token in sessions)) {
    return res.status(401).send("invalid token");
  }

  let author = sessions[data.token];

  let statement = db.prepare(`DELETE FROM photos WHERE id = ? AND author = ?`);
  statement.run([data.id, author], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error deleting photo");
    }

    return res.status(204);
  });
});

server.post("/register", (req, res) => {
  let data = req.body;

  bcrypt.hash(data.password, saltRounds, (err, hashed_password) => {
    if (err) {
      return res.status(500).send("Something went wrong");
    }
    let statement = db.prepare(
      "INSERT INTO users(username, password) VALUES(?, ?)"
    );

    statement.run(data.username, hashed_password, (err) => {
      if (err) {
        return res.status(409).send("user with that username already exists");
      }
      let session_token = make_session(data.username);
      return res.status(201).send(session_token);
    });
  });
});

server.post("/login", (req, res) => {
  let data = req.body;
  let username = data.username;
  let password = data.password;

  let get_statement = db.prepare(`SELECT * FROM users WHERE username = ?`);
  get_statement.get(username, (err, result) => {
    if (err) {
      res.status(500).send("user does not exist");
      return;
    }

    let hashed_pass = result.password;

    bcrypt.compare(password, hashed_pass, (error, validation) => {
      if (error) {
        return res.status(500).send("server error");
      }
      if (validation) {
        let session_token = make_session(username);
        return res.status(200).send(session_token);
      }
      return res.status(401).send("incorrect password");
    });
  });
});

server.get("/checkLogin", (req, res) => {
  let data = req.query;
  if (data.token in sessions) {
    let username = sessions[data.token];
    return res.status(200).send(username);
  }
  return res.status(401).send("session does not exist or expired");
});

server.listen(3000, () => {
  console.log("Server listening at localhost:3000");
});
