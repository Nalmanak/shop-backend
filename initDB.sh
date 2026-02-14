#!/bin/bash
sqlite3 database.db  "create table Orders (id TEXT PRIMARY KEY, date TEXT,data TEXT, eventId TEXT, userId TEXT);"
sqlite3 database.db  "create table Products (id TEXT PRIMARY KEY, name TEXT, price REAL, imgPath TEXT, activated TEXT, kitchenProduct TEXT);"
sqlite3 database.db  "create table Events (id TEXT PRIMARY KEY, name TEXT, date TEXT);"
sqlite3 database.db  "create table Users (id TEXT PRIMARY KEY, name TEXT, firstName TEXT, telephone TEXT, amountPaid REAL);"