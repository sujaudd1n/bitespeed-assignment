const express = require("express");
const bodyParser = require("body-parser");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post("/identify", async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
      return res.status(400).json({ error: "Either email or phoneNumber is required" });
    }

    const result = await processIdentity(email, phoneNumber);
    res.json(result);
  } catch (error) {
    console.error("Error in /identify:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

async function processIdentity(email, phoneNumber) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM Contact
      WHERE deletedAt IS NULL
      AND (email = ? OR phoneNumber = ?)
      ORDER BY createdAt ASC
    `;

    db.all(query, [email, phoneNumber], async (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      if (rows.length === 0) {
        const newContactId = await createContact(phoneNumber, email, null, "primary");
        resolve({
          contact: {
            primaryContatctId: newContactId,
            emails: email ? [email] : [],
            phoneNumbers: phoneNumber ? [phoneNumber] : [],
            secondaryContactIds: [],
          },
        });
        return;
      }
      
    });
  });
}

function createContact(phoneNumber, email, linkedId, linkPrecedence) {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO Contact (phoneNumber, email, linkedId, linkPrecedence)
      VALUES (?, ?, ?, ?)
    `;

    db.run(query, [phoneNumber, email, linkedId, linkPrecedence], function (err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Identify endpoint: http://localhost:${PORT}/identify`);
});
