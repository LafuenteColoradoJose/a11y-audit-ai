from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline
from typing import Optional, Dict, Any

app = FastAPI(title="API WCAG IA Generativa", description="Corrige código automáticamente")

# Configurar CORS para permitir peticiones desde Angular (localhost:4200)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cargar el modelo generativo entrenado
# Asegúrate de haber ejecutado train_generative.py primero
try:
    ruta_modelo = "./mi_modelo_wcag_generativo"
    # Usamos text2text-generation para modelos tipo T5/CodeT5
    corrector = pipeline("text2text-generation", model=ruta_modelo)
    print("¡Modelo Generativo Cargado!")
except Exception as e:
    print(f"Error cargando modelo: {e}")
    print("Asegúrate de entrenar el modelo primero con 'python train_generative.py'")
    corrector = None

class FixRequest(BaseModel):
    code: str
    issue: Optional[Dict[str, Any]] = None # Angular envía el objeto issue completo

@app.post("/api/fix") # Angular llama a /api/fix
async def fix_code(datos: FixRequest):
    if not corrector:
        return {"error": "Modelo no cargado"}

    # Preprocesar igual que en el entrenamiento
    input_text = "fix wcag: " + datos.code
    
    # Generar corrección
    resultados = corrector(input_text, max_length=128)
    codigo_corregido = resultados[0]['generated_text']
    
    # Devolver formato esperado por Angular
    return {
        "fixedCode": codigo_corregido
    }

@app.post("/api/analyze")
async def analyze_code(datos: FixRequest):
    # Este modelo es generativo (fixer), no de clasificación.
    # Devolvemos una lista vacía para que Angular confíe en Axe-Core y Regex
    # o podríamos implementar lógica futura aquí.
    return {"issues": []}

