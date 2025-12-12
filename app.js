import  express from 'express'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import { v4 as uuidv4 } from 'uuid'
const port = 3000
import cors from 'cors';

const app = express()
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.send('Hello World!')
})

let db;

async function getDBConnection(){
    db = await open({
        filename: "./database.db",
        driver: sqlite3.Database
    });
}

//////////////////////////////////////
//           PRODUCTS               //
//////////////////////////////////////

app.get("/api/products", async function(req, res) {
    let data = await db.all("SELECT * from Products");
    return res.json(data)
})

app.patch("/api/products/:id", async function(req, res) {
    if (!req.body.patchs || !req.params.id) {
        return res.status(400).send({
            message: "Error : Missing patch"
         });
    }
    let patchSet = "SET";

    req.body.patchs.forEach((patch, index) => {
        if (patch.value) {
            patchSet += `${index !== 0 ? ", ": " "}${patch.name}="${patch.value}"`
        }
    });
    await db.run(`UPDATE Products ${patchSet} WHERE id=?`, req.params.id)
    return res.json()
})

app.post("/api/products", async function(req, res) {
    if (!req.body.name || !req.body.price) {
        return res.status(400).send({
            message: "Error : Missing datas"
         });
    }

    const uuid = uuidv4(); 
    const imagePath = req.body.imgPath ?? ""

    await db.run(
        'INSERT INTO Products (id, name, price, imgPath, activated) VALUES (?, ?, ?, ?, ?)',
        uuid, req.body.name, req.body.price, imagePath, false
    )
    return res.json()
})

app.delete("/api/products", async function(req, res) {
    if (!req.body.id) {
        return res.status(400).send({
            message: 'Missing ID to delete'
         });
    }
    await db.run(
        'DELETE FROM Products WHERE id = (?)',
        req.body.id
    )
    return res.json()
})

//////////////////////////////////////
//            ORDERS                //
//////////////////////////////////////

app.get('/api/orders/:id', async function(req, res) {
    let datas = await db.all("SELECT * from Orders WHERE eventId=?", req.params.id)
    const orders = datas.map((data) => {return {data : data.data, date: data.date}})
    return res.json(orders)
})

app.post('/api/orders', async function(req, res) {
    if (!req.body.data || (!req.body.eventId && !req.body.userId)) {
        return res.status(400).send({
            message: 'This is an error!'
         });
    }

    const date = new Date();

    const dataId = req.body.eventId ?? req.body.userId
    const uuid = uuidv4(); 

    const result = await db.run(
        `INSERT INTO Orders (id, data, date, ${req.body.eventId ? "eventId": "userId"}) VALUES (?, ?, ?, ?)`,
        uuid, req.body.data, date, dataId
    )
    return res.json()
})

app.delete('/api/order/:id', async function(req, res) {
    if (!req.params.id) {
        return res.status(400).send({
            message: "Error : missing user id"
        });
    }

    await db.run(
        'DELETE FROM Orders WHERE id = (?)',
        req.params.id
    )
    return res.json()
})

//////////////////////////////////////
//            EVENT                 //
//////////////////////////////////////

app.get('/api/event/:id', async function(req, res) {
    let data = await db.all("SELECT * from Events WHERE id=?", req.params.id)
    let orders = await db.all("SELECT * from Orders WHERE eventId=?", req.params.id)
    orders = orders.map(order=> {return JSON.parse(order.data)})
    data.orders = orders

    const event = {
        ...data[0],
        orders : orders
    }
    
    return res.json(event)
})

//////////////////////////////////////
//            EVENTS                //
//////////////////////////////////////

app.get('/api/events', async function(req, res) {
    let events = await db.all("SELECT * from Events");
    return res.json(events)
})

app.post("/api/events", async function(req, res) {
    if (!req.body.name || !req.body.date) {
        return res.status(400).send({
            message: 'This is an error!'
         });
    }

    const uuid = uuidv4(); 

    await db.run(
        'INSERT INTO Events (id, name, date) VALUES (?, ?, ?)',
        uuid, req.body.name, req.body.date
    )
    return res.json()
})

app.delete("/api/events", async function(req, res) {
    if (!req.body.id) {
        return res.status(400).send({
            message: 'Missing ID to delete'
         });
    }

    await db.run(
        'DELETE FROM Orders WHERE eventId = (?)',
        req.body.id
    )

    await db.run(
        'DELETE FROM Events WHERE id = (?)',
        req.body.id
    )
    return res.json()
})

//////////////////////////////////////
//              Users               //
//////////////////////////////////////

app.get('/api/user/:id', async function(req, res) {
    if (!req.params.id) {
        return res.status(400).send({
            message: "Error : no ID"
        });
    }

    let user = await db.all("SELECT * from Users WHERE id=?", req.params.id);
    const orders = await db.all("SELECT * from Orders WHERE userId=?", req.params.id);
    const userWithOrders =   {...user[0], orders : orders};
    return res.json(userWithOrders)
})

app.delete('/api/user/:id', async function(req, res) {
    if (!req.params.id) {
        return res.status(400).send({
            message: "Error : missing user id"
        });
    }

    await db.run(
        'DELETE FROM Orders WHERE userId = (?)',
        req.params.id
    )

    await db.run(
        'DELETE FROM Users WHERE id = (?)',
        req.params.id
    )
    return res.json()
})

app.get('/api/users', async function(req, res) {
    let users = await db.all("SELECT * from Users");
    let promises = [];

    users.forEach((user) => {
        promises.push(db.all("SELECT * from Orders WHERE userId=?", user.id));
    })

    const userOrders = await Promise.all(promises)

    if (userOrders.length !== users.length) {
        return res.status(400).send({
            message: "Error : internal server error"
        });
    }
    const usersWithOrders = users.map((user, index) => {
        return {...user, orders : userOrders[index]};
    });
    return res.json(usersWithOrders)
})

app.post("/api/users", async function(req, res) {
    if (!req.body.name || !req.body.firstName || !req.body.telephone) {
        return res.status(400).send({
            message: "Error : Missing datas"
        });
    }

    const uuid = uuidv4();
    await db.run(
        'INSERT INTO Users (id, name, firstName, telephone) VALUES (?, ?, ?, ?)',
        uuid, req.body.name, req.body.firstName, req.body.telephone
    )
    return res.json();
})

app.post("/api/user/payement", async function(req, res) {
    if (!req.body.userId || !req.body.amount) {
        return res.status(400).send({
            message: "Error : Missing datas"
        });
    }

    if (isNaN(Number(req.body.amount))) {
        return res.status(400).send({
            message: "Error : amount must be a number"
        });
    }

    const user = await db.all("SELECT * from Users WHERE id=?", req.body.userId)

    if (!user[0]) {
        return res.status(400).send({
            message: "Error : Unknown user"
        });
    }

    const newAmount = Number(user[0].amountPaid ?? 0) + Number(req.body.amount);

    await db.run(`UPDATE Users SET amountPaid=? WHERE id=?`, newAmount, req.body.userId)
    return res.json();
})

//////////////////////////////////////

app.listen(port, async function(){
    await getDBConnection();
    console.log('server on! http://localhost:' + port);
});

process.on('exit', async function() {
    await db.close();
});