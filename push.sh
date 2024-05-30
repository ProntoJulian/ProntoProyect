#!/bin/bash

# Verifica que se haya proporcionado un mensaje de commit
if [ -z "$1" ]; then
  echo "Error: Debes proporcionar un mensaje para el commit."
  echo "Uso: ./git_push.sh \"Tu mensaje de commit\""
  exit 1
fi

# Guarda el mensaje del commit
commit_message="$1"

# Muestra el estado de git
git status

# Agrega todos los cambios
git add .

# Hace el commit con el mensaje proporcionado
git commit -m "$commit_message"

git pull origin main --no-rebase

# Empuja los cambios a la rama main
git push origin main

echo "Cambios empujados a la rama main con éxito."
