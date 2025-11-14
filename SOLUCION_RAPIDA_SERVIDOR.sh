#!/bin/bash
# Script de solución rápida para resolver conflictos en el servidor

echo "🚨 Solución Rápida para Conflictos de Merge"
echo "==========================================="
echo ""

# Paso 1: Abortar el merge actual
echo "📍 Paso 1: Abortando el merge conflictivo..."
git merge --abort 2>/dev/null || echo "  ℹ️  No hay merge activo para abortar"

# Paso 2: Resetear cualquier cambio local
echo ""
echo "📍 Paso 2: Limpiando archivos conflictivos..."
git reset --hard HEAD

# Paso 3: Obtener los últimos cambios
echo ""
echo "📍 Paso 3: Obteniendo últimos cambios del repositorio..."
git fetch origin

# Paso 4: Hacer checkout forzado al branch correcto
echo ""
echo "📍 Paso 4: Cambiando al branch con las correcciones..."
git checkout -B claude/fix-duplicate-client-errors-011MvaCXRRBFjr4zRPTyK8fG origin/claude/fix-duplicate-client-errors-011MvaCXRRBFjr4zRPTyK8fG

echo ""
echo "✅ ¡Listo! Conflictos resueltos"
echo ""
echo "📊 Estado actual:"
git status --short
echo ""
echo "📝 Archivos actualizados:"
git log --oneline -3
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 SIGUIENTE PASO: Aplicar la migración SQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Ejecuta:"
echo "  mysql -u root -p1234 jelcom_internet < APLICAR_MIGRACION_CLIENTES.sql"
echo ""
