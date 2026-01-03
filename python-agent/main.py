from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline
from typing import Optional, Dict, Any

import re
from bs4 import BeautifulSoup

app = FastAPI(title="API WCAG IA Generativa", description="Corrige código automáticamente")

def heuristic_fix_all(code: str) -> str:
    """Fallback multisolución: Semántica + Skip Links + Atributos básicos."""
    try:
        soup = BeautifulSoup(code, 'html.parser')
        changed = False

        # --- 1. Arreglo Semántico (Div Soup) ---
        replacements = {
            'header': 'header',
            'nav': 'nav',
            'content': 'main',
            'main': 'main',
            'footer': 'footer',
            'sidebar': 'aside',
            'aside': 'aside'
        }

        for class_name, new_tag in replacements.items():
            for tag in soup.find_all("div", class_=class_name):
                tag.name = new_tag
                # Limpiar clase redundante
                classes = tag.get('class', [])
                if class_name in classes:
                    classes.remove(class_name)
                    if not classes: del tag['class']
                    else: tag['class'] = classes
                changed = True

        # --- 2. Skip Link Automatico (Si falta y hay estructura) ---
        # Detectamos si ya existe <header> y <main>
        header = soup.find('header')
        main = soup.find('main')
        
        # Si tenemos header y main, pero no hay un enlace que apunte al main
        if header and main:
            # Asegurar que main tenga ID
            if not main.get('id'):
                main['id'] = 'main-content'
                changed = True
            
            main_id = main['id']
            # Buscar si ya existe un skip link
            has_skip = soup.find('a', href=f"#{main_id}")
            
            if not has_skip:
                # Crear Skip Link
                skip_link = soup.new_tag('a', href=f"#{main_id}")
                skip_link.string = "Skip to main content"
                skip_link['class'] = "skip-link"
                # Insertar como primer hijo del header (o body si no hay header, pero aquí asumimos header)
                header.insert(0, skip_link)
                changed = True

        if changed:
            # Usamos prettify para asegurar indentación limpia siempre
            return soup.prettify()
        return code
        
    except Exception as e:
        print(f"Error en heurística avanzada: {e}")
        return code

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
    ai_success = False
    codigo_corregido = datos.code

    try:
        resultados = corrector(
            input_text, 
            max_new_tokens=1024,
            num_beams=5,
            early_stopping=True,
            repetition_penalty=1.0,
            length_penalty=2.0
        )
        raw_fix = resultados[0]['generated_text']
        
        # 1. Eliminar prefijos comunes
        if raw_fix.startswith("fix wcag:"):
            raw_fix = raw_fix.replace("fix wcag:", "").strip()

        # 2. Seguridad de Longitud
        ratio_longitud = len(raw_fix) / len(datos.code)
        if 0.6 <= ratio_longitud <= 2.0:
            codigo_corregido = raw_fix
            ai_success = True
        else:
            print(f"Alerta: Longitud sospechosa (ratio {ratio_longitud:.2f}). Usando Heurística en /api/fix.")
            
    except Exception as e:
        print(f"Error generando en /api/fix: {e}")

    # 3. Fallback Heurístico si la IA falló
    if not ai_success or codigo_corregido == datos.code:
         codigo_corregido = heuristic_fix_all(datos.code)
    
    # 4. Fallbacks extra (legacy)
    if "role=\"button\"" in codigo_corregido:
        # Caso: <button role="button"> -> <button>
         if "<button" in datos.code and "role=\"button\"" in datos.code:
             codigo_corregido = datos.code.replace('role="button"', '').replace("role='button'", '')
             codigo_corregido = " ".join(codigo_corregido.split())
             codigo_corregido = codigo_corregido.replace("<button >", "<button>")
    
    # 5. Limpieza de atributos alt vacíos
    if "alt=\"\"\"" in codigo_corregido:
        codigo_corregido = codigo_corregido.replace("alt=\"\"\"", "alt=\"\"")
    
    return {
        "fixedCode": codigo_corregido
    }

@app.post("/api/analyze")
async def analyze_code(datos: FixRequest):
    if not corrector:
        return {"issues": []}
    
    # Use the model to see if it wants to "fix" the input
    input_text = "fix wcag: " + datos.code
    
    # Intento con IA
    ai_success = False
    suggested_fix = datos.code

    try:
        results = corrector(
            input_text, 
            max_new_tokens=1024,
            num_beams=5, 
            early_stopping=True,
            repetition_penalty=1.0, # Neutral
            length_penalty=2.0
        )
        raw_fix = results[0]['generated_text']
        
        # Validación de Calidad
        ratio = len(raw_fix) / len(datos.code)
        
        if 0.5 < ratio < 2.0:
            suggested_fix = raw_fix
            ai_success = True
            if suggested_fix.startswith("fix wcag:"):
                suggested_fix = suggested_fix.replace("fix wcag:", "").strip()
        else:
             print(f"⚠️ IA descartada (Ratio {ratio:.2f}). Usando Heurística.")

    except Exception as e:
        print(f"Error IA: {e}")

    # Si la IA falló o fue descartada, probamos heurística
    if not ai_success or suggested_fix == datos.code:
        suggested_fix = heuristic_fix_all(datos.code)

    # Normalize for comparison
    def normalize(s): return " ".join(s.split())
    
    if normalize(suggested_fix) != normalize(datos.code):
        return {
            "issues": [{
                "id": f"ai-gen-{abs(hash(suggested_fix))}",
                "ruleId": "ai-generative-improvement",
                "severity": "medium",
                "message": "AI (or Heuristics) suggests an accessibility improvement.",
                "type": "warning", 
                "snippet": datos.code, 
                "fix": { # Formato que espera Angular
                    "fixedCode": suggested_fix,
                    "description": "Semantic structure improvement"
                }
            }]
        }
    
    return {"issues": []}

