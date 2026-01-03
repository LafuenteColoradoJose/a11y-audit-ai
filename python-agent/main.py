from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline
from typing import Optional, Dict, Any

app = FastAPI(title="API WCAG IA Generativa", description="Corrige código automáticamente")

# Configurar CORS para permitir peticiones desde Angular (localhost:4200)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permissive for local dev to avoid stupid CORS issues
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
    # Generar corrección con parámetros más estrictos para evitar alucinaciones
    resultados = corrector(input_text, max_length=128, num_beams=5, early_stopping=True)
    codigo_corregido = resultados[0]['generated_text']

    # --- Post-procesamiento Heurístico (Limpieza) ---
    
    # 1. Eliminar prefijos comunes si el modelo los repite
    if codigo_corregido.startswith("fix wcag:"):
        codigo_corregido = codigo_corregido.replace("fix wcag:", "").strip()

    # 2. Si el modelo no cambió nada o falló, aplicar reglas hardcoded de respaldo (Fallback)
    # Esto ayuda cuando el modelo es "tonto" o no ha visto el caso exacto.
    if codigo_corregido == datos.code or "role=\"button\"" in codigo_corregido:
        # Caso: <button role="button"> -> <button>
        if "<button" in datos.code and "role=\"button\"" in datos.code:
             codigo_corregido = datos.code.replace('role="button"', '').replace("role='button'", '')
             # Limpiar dobles espacios generados
             codigo_corregido = " ".join(codigo_corregido.split())
             # Asegurar que <button> quede limpio
             codigo_corregido = codigo_corregido.replace("<button >", "<button>")
    
    # 3. Limpieza de atributos alt vacíos o mal formados
    if "alt=\"\"\"" in codigo_corregido:
        codigo_corregido = codigo_corregido.replace("alt=\"\"\"", "alt=\"\"")
    
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

