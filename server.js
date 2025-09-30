const express = require('express');
const bodyParser = require('body-parser');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Identify endpoint
app.post('/identify', async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;
    
    if (!email && !phoneNumber) {
      return res.status(400).json({ error: 'Either email or phoneNumber is required' });
    }

    const result = await processIdentity(email, phoneNumber);
    res.json(result);
  } catch (error) {
    console.error('Error in /identify:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function processIdentity(email, phoneNumber) {
  return new Promise((resolve, reject) => {
    // Find all contacts that match the email or phoneNumber
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
        // No existing contacts found, create a new primary contact
        const newContactId = await createContact(phoneNumber, email, null, 'primary');
        resolve({
          contact: {
            primaryContatctId: newContactId,
            emails: email ? [email] : [],
            phoneNumbers: phoneNumber ? [phoneNumber] : [],
            secondaryContactIds: []
          }
        });
        return;
      }

      // Process existing contacts
      await processExistingContacts(rows, email, phoneNumber, resolve, reject);
    });
  });
}

async function processExistingContacts(existingContacts, newEmail, newPhone, resolve, reject) {
  // Find the primary contact (oldest one)
  const primaryContact = existingContacts.find(contact => contact.linkPrecedence === 'primary') || existingContacts[0];
  
  // Get all linked contacts (primary + secondary)
  const allLinkedContacts = await getAllLinkedContacts(primaryContact.id);
  
  const emails = new Set();
  const phoneNumbers = new Set();
  const secondaryContactIds = [];
  
  allLinkedContacts.forEach(contact => {
    if (contact.email) emails.add(contact.email);
    if (contact.phoneNumber) phoneNumbers.add(contact.phoneNumber);
    if (contact.linkPrecedence === 'secondary') secondaryContactIds.push(contact.id);
  });

  // Check if we need to create a new secondary contact
  const hasNewInfo = (newEmail && !emails.has(newEmail)) || (newPhone && !phoneNumbers.has(newPhone));
  
  if (hasNewInfo) {
    const newContactId = await createContact(newPhone, newEmail, primaryContact.id, 'secondary');
    secondaryContactIds.push(newContactId);
    
    // Add new info to sets
    if (newEmail) emails.add(newEmail);
    if (newPhone) phoneNumbers.add(newPhone);
  }

  // Check if we need to convert any primary contacts to secondary
  await checkAndConvertPrimaries(existingContacts, primaryContact.id);

  resolve({
    contact: {
      primaryContatctId: primaryContact.id,
      emails: Array.from(emails),
      phoneNumbers: Array.from(phoneNumbers),
      secondaryContactIds: secondaryContactIds.sort((a, b) => a - b)
    }
  });
}

async function getAllLinkedContacts(primaryId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM Contact 
      WHERE deletedAt IS NULL 
      AND (id = ? OR linkedId = ?)
      ORDER BY createdAt ASC
    `;
    
    db.all(query, [primaryId, primaryId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function checkAndConvertPrimaries(contacts, newPrimaryId) {
  const primariesToConvert = contacts.filter(contact => 
    contact.linkPrecedence === 'primary' && contact.id !== newPrimaryId
  );

  for (const primary of primariesToConvert) {
    await updateContactToSecondary(primary.id, newPrimaryId);
    
    // Also update all secondary contacts linked to this primary
    await updateLinkedContacts(primary.id, newPrimaryId);
  }
}

async function updateContactToSecondary(contactId, newLinkedId) {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE Contact 
      SET linkPrecedence = 'secondary', linkedId = ?, updatedAt = CURRENT_TIMESTAMP 
      WHERE id = ? AND deletedAt IS NULL
    `;
    
    db.run(query, [newLinkedId, contactId], function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

async function updateLinkedContacts(oldLinkedId, newLinkedId) {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE Contact 
      SET linkedId = ?, updatedAt = CURRENT_TIMESTAMP 
      WHERE linkedId = ? AND deletedAt IS NULL
    `;
    
    db.run(query, [newLinkedId, oldLinkedId], function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

function createContact(phoneNumber, email, linkedId, linkPrecedence) {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO Contact (phoneNumber, email, linkedId, linkPrecedence) 
      VALUES (?, ?, ?, ?)
    `;
    
    db.run(query, [phoneNumber, email, linkedId, linkPrecedence], function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Identify endpoint: http://localhost:${PORT}/identify`);
});