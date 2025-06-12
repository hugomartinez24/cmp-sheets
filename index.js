const express = require("express");
const { google } = require("googleapis");
const bodyParser = require("body-parser");

const app = express();
// ——— Endpoint que expone el esquema OpenAPI ———
app.get("/mcp", (req, res) => {
  res.json({
    openapi: "3.1.0",
    info: {
      title: "Google Sheets MCP",
      version: "1.0.0"
    },
    paths: {
      "/mcp": {
        post: {
          operationId: "addToSheet",
          description: "Añade contenido a la hoja de cálculo",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    messages: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          content: { type: "string" }
                        },
                        required: ["content"]
                      }
                    }
                  },
                  required: ["messages"]
                }
              }
            }
          },
          responses: {
            "200": {
              description: "Dato escrito correctamente"
            }
          }
        }
      }
    }
  });
});
app.use(bodyParser.json());

// Carga la clave desde una variable de entorno
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_JSON),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// Sustituye esto por el ID de tu hoja de Google Sheets
const SPREADSHEET_ID = "12T608jDWhC21BK02FU8chk5J1CCZJXbXZw17AkXAC9E";

app.post("/mcp", async (req, res) => {
  const { messages } = req.body;
  const latestMessage = messages[messages.length - 1]?.content;

  if (!latestMessage) {
    return res.status(400).send({ error: "No message content" });
  }

  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "A1",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[latestMessage]],
      },
    });

    res.send({ message: "Dato escrito correctamente en Google Sheets" });
  } catch (error) {
    console.error("Error escribiendo en Google Sheets:", error);
    res.status(500).send("Error escribiendo en Google Sheets");
  }
});

// 👉 Esto es lo que OpenAI necesita leer cuando visita la raíz "/"
app.get("/", (req, res) => {
  res.json({
    openapi: "3.1.0",
    info: { title: "Google Sheets MCP", version: "1.0.0" },
    paths: { "/mcp": { post: { operationId: "addToSheet" } } }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor MCP en puerto ${PORT}`));
