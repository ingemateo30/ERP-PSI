#!/bin/bash
# Script para resolver conflictos de merge automáticamente

echo "🔧 Resolviendo conflictos de merge..."
echo ""

# Obtener el directorio del script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Verificar que estamos en un estado de conflicto
if ! git status | grep -q "Unmerged paths"; then
    echo "✅ No hay conflictos que resolver"
    exit 0
fi

echo "📋 Archivos con conflictos encontrados:"
git status --short | grep "^UU"
echo ""

# Función para resolver conflicto tomando la versión incoming (theirs)
resolver_con_theirs() {
    local archivo="$1"
    echo "  → Resolviendo $archivo (tomando cambios nuevos)..."
    git checkout --theirs "$archivo"
    git add "$archivo"
}

# Resolver cada archivo con conflicto
echo "🔨 Resolviendo conflictos..."

# Resolver backend/routes/clientes.js
if [ -f "backend/routes/clientes.js" ]; then
    resolver_con_theirs "backend/routes/clientes.js"
fi

# Resolver backend/routes/clienteCompleto.js
if [ -f "backend/routes/clienteCompleto.js" ]; then
    resolver_con_theirs "backend/routes/clienteCompleto.js"
fi

# Resolver backend/controllers/clienteCompletoController.js
if [ -f "backend/controllers/clienteCompletoController.js" ]; then
    resolver_con_theirs "backend/controllers/clienteCompletoController.js"
fi

echo ""
echo "✅ Conflictos resueltos"
echo ""
echo "📊 Estado actual:"
git status --short

echo ""
echo "🎯 Siguiente paso:"
echo "   Ejecuta: git commit -m 'fix: resolver conflictos de merge manteniendo mejoras de manejo de errores'"
echo ""
