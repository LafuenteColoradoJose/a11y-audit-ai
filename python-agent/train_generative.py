import pandas as pd
from datasets import Dataset
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, Seq2SeqTrainingArguments, Seq2SeqTrainer, DataCollatorForSeq2Seq
import torch

# 1. CARGAR DATOS (NUEVO FORMATO)
# El CSV debe tener columnas: 'input_text' (código malo) y 'target_text' (código corregido)
try:
    df = pd.read_csv('mi_dataset_wcag_gen.csv')
    # Verificación simple de columnas
    if 'input_text' not in df.columns or 'target_text' not in df.columns:
        raise ValueError("El CSV debe tener columnas 'input_text' y 'target_text'")
except Exception as e:
    print(f"Aviso: {e}")
    print("Creando datos de ejemplo en memoria para demostración...")
    data = {
        'input_text': [
            "<img src='foto.jpg'>", 
            "<div (click)='save()'>Guardar</div>",
            "<input type='text'>",
            "<a href='#'>Click aqui</a>"
        ],
        'target_text': [
            "<img src='foto.jpg' alt='Descripción de la foto'>", 
            "<button type='button' (click)='save()'>Guardar</button>",
            "<input type='text' aria-label='Entrada de texto'>",
            "<a href='#'>Ver más detalles</a>"
        ]
    }
    df = pd.DataFrame(data)

dataset = Dataset.from_pandas(df)
dataset = dataset.train_test_split(test_size=0.1)

# 2. PREPARAR EL MODELO GENERATIVO (CodeT5)
# CodeT5 es excelente para tareas de código (Code-to-Code)
model_name = "Salesforce/codet5-small" 
tokenizer = AutoTokenizer.from_pretrained(model_name)

def preprocess_function(examples):
    # Añadimos un prefijo para guiar al modelo (opcional pero útil en T5)
    inputs = ["fix wcag: " + doc for doc in examples["input_text"]]
    
    # Tokenizar entradas
    model_inputs = tokenizer(inputs, max_length=128, truncation=True, padding="max_length")

    # Tokenizar salidas (el código corregido)
    labels = tokenizer(examples["target_text"], max_length=128, truncation=True, padding="max_length")
    
    model_inputs["labels"] = labels["input_ids"]
    return model_inputs

tokenized_datasets = dataset.map(preprocess_function, batched=True)

# 3. CONFIGURAR EL MODELO SEQ2SEQ
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

# 4. CONFIGURAR EL ENTRENAMIENTO
training_args = Seq2SeqTrainingArguments(
    output_dir="./resultados_wcag_gen",
    eval_strategy="epoch",
    learning_rate=2e-5,
    per_device_train_batch_size=4, # Batch pequeño para no saturar memoria
    per_device_eval_batch_size=4,
    num_train_epochs=15,
    weight_decay=0.01,
    save_total_limit=2,
    predict_with_generate=True,
    logging_steps=10,
)

data_collator = DataCollatorForSeq2Seq(tokenizer=tokenizer, model=model)

# 5. INICIAR ENTRENAMIENTO
trainer = Seq2SeqTrainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_datasets["train"],
    eval_dataset=tokenized_datasets["test"],
    tokenizer=tokenizer,
    data_collator=data_collator,
)

print("Iniciando entrenamiento del modelo generativo...")
train_result = trainer.train()

# 6. MÉTRICAS Y GUARDADO
metrics = train_result.metrics
trainer.log_metrics("train", metrics)
trainer.save_metrics("train", metrics)

print("\n" + "="*40)
print("       INFORME DE ENTRENAMIENTO       ")
print("="*40)
print(f"Tiempo total       : {metrics['train_runtime']:.2f} segundos")
print(f"Pérdida final      : {metrics['train_loss']:.4f}")
print(f"Muestras/segundo   : {metrics['train_samples_per_second']:.2f}")
print(f"Pasos/segundo      : {metrics['train_steps_per_second']:.2f}")
print(f"Épocas completadas : {metrics['epoch']:.2f}")
print("="*40 + "\n")

output_path = "./mi_modelo_wcag_generativo"
model.save_pretrained(output_path)
tokenizer.save_pretrained(output_path)
print(f"¡Modelo generativo guardado en {output_path}!")
