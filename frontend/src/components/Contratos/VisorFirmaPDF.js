// frontend/src/components/Contratos/VisorFirmaPDF.js - COMPLETO CON WACOM
import React, { useState, useRef, useEffect } from 'react';
import SignaturePad from '../ui/SignaturePad';
import {
    FileText,
    PenTool,
    Save,
    RotateCcw,
    Download,
    Upload,
    Check,
    Eye,
    Tablet,
    AlertCircle,
    Wifi,
    WifiOff
} from 'lucide-react';

const VisorFirmaPDF = ({ contratoId, onFirmaCompleta, onCancelar }) => {
    const sigCanvas = useRef();
    const fileInputRef = useRef();
    const wacomCanvasRef = useRef();

    const [pdfUrl, setPdfUrl] = useState('');
    const [contratoData, setContratoData] = useState({});
    const [loading, setLoading] = useState(true);
    const [procesandoFirma, setProcesandoFirma] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [pdfCargado, setPdfCargado] = useState(false);

    // Estados para Wacom
    const [wacomAvailable, setWacomAvailable] = useState(false);
    const [wacomDevices, setWacomDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [isCapturingWacom, setIsCapturingWacom] = useState(false);

    const [modoFirma, setModoFirma] = useState('digital'); // 'wacom', 'digital', 'imagen'
    const [datosSignature, setDatosSignature] = useState({
        firmado_por: '',
        cedula_firmante: '',
        tipo_firma: 'digital',
        observaciones: ''
    });

    useEffect(() => {
        cargarContratoParaFirma();
        detectarWacom();
        
        return () => {
            limpiarWacom();
        };
    }, [contratoId]);

    // Detectar tablets Wacom al cargar el componente
    const detectarWacom = async () => {
        try {
            console.log('🎨 Detectando tablets Wacom...');
            
            // Verificar si WebHID está disponible
            if (!navigator.hid) {
                console.log('⚠️ WebHID no está disponible - usando modo digital');
                setModoFirma('digital');
                return;
            }

            console.log('✅ WebHID disponible');

            // Obtener dispositivos ya autorizados
            const devices = await navigator.hid.getDevices();
            console.log('📱 Todos los dispositivos HID:', devices);
            
            const wacomDevices = devices.filter(device => {
                console.log(`🔍 Dispositivo: VID=${device.vendorId?.toString(16)}, PID=${device.productId?.toString(16)}, Nombre=${device.productName}`);
                return device.vendorId === 0x056a; // Wacom Vendor ID
            });
            
            console.log('🎨 Dispositivos Wacom encontrados:', wacomDevices);
            
            if (wacomDevices.length > 0) {
                console.log(`✅ ${wacomDevices.length} tablet(s) Wacom ya autorizada(s)`);
                setWacomDevices(wacomDevices);
                setSelectedDevice(wacomDevices[0]);
                setWacomAvailable(true);
                setModoFirma('wacom');
                setSuccess(`Tablet Wacom detectada: ${wacomDevices[0].productName}`);
            } else {
                console.log('📱 No hay tablets Wacom autorizadas - mostrando botón para conectar');
                setModoFirma('digital');
                setSuccess('Haga clic en "Conectar Wacom" para autorizar su STU-540');
            }
            
        } catch (error) {
            console.error('❌ Error detectando Wacom:', error);
            setModoFirma('digital');
        }
    };

    // Solicitar acceso a tablets Wacom
    const solicitarAccesoWacom = async () => {
        try {
            console.log('🔑 Solicitando acceso a tablets Wacom...');
            
            if (!navigator.hid) {
                setError('WebHID no está disponible. Use Chrome o Edge para soporte Wacom.');
                return;
            }

            console.log('📋 Mostrando dialog de selección de dispositivo...');

            // Solicitar específicamente tablets Wacom
            const devices = await navigator.hid.requestDevice({
                filters: [
                    { vendorId: 0x056a }, // Wacom Vendor ID
                    { vendorId: 0x056a, productId: 0x00f0 }, // STU-540 específico
                    { vendorId: 0x056a, productId: 0x00f1 }, // STU-540 variante
                ]
            });

            console.log('📱 Dispositivos seleccionados:', devices);

            if (devices.length > 0) {
                // Aceptar cualquier dispositivo Wacom seleccionado (no solo STU-540)
                const selectedDevice = devices[0];
                console.log('✅ Dispositivo Wacom seleccionado:', selectedDevice.productName || `VID:${selectedDevice.vendorId?.toString(16)}`);

                setWacomDevices(devices);
                setSelectedDevice(selectedDevice);
                setWacomAvailable(true);
                setModoFirma('wacom');
                setSuccess(`✅ ${selectedDevice.productName || 'Tablet Wacom'} conectada y lista para firmar`);
                setError('');

                // Intentar abrir el dispositivo para verificar que responde
                try {
                    if (!selectedDevice.opened) {
                        await selectedDevice.open();
                        console.log('🔓 Dispositivo Wacom abierto correctamente');
                        await selectedDevice.close();
                    }
                } catch (openError) {
                    // Solo warning - el dispositivo puede funcionar igualmente
                    console.warn('⚠️ Aviso al abrir dispositivo:', openError.message);
                }
            } else {
                console.log('❌ No se seleccionó ningún dispositivo');
                setError('No se seleccionó ningún dispositivo. Haga clic en "Conectar Wacom" e seleccione su tablet de la lista.');
            }
        } catch (error) {
            console.error('❌ Error solicitando acceso Wacom:', error);
            
            if (error.name === 'NotFoundError') {
                setError('No se encontraron tablets Wacom. Verifique que su STU-540 esté conectado por USB.');
            } else if (error.name === 'NotAllowedError') {
                setError('Acceso denegado. Debe autorizar el acceso a la tablet Wacom.');
            } else {
                setError('Error conectando con tablet Wacom: ' + error.message);
            }
        }
    };

    // Capturar firma con tablet Wacom
    const capturarFirmaWacom = async () => {
        if (!selectedDevice) {
            setError('No hay dispositivo Wacom seleccionado');
            return null;
        }

        try {
            setIsCapturingWacom(true);
            setError('');
            console.log('🖊️ Iniciando captura con STU-540...');
            console.log('📱 Dispositivo seleccionado:', selectedDevice);

            // Abrir conexión con el dispositivo
            if (!selectedDevice.opened) {
                console.log('🔓 Abriendo conexión con STU-540...');
                await selectedDevice.open();
                console.log('✅ Conexión abierta exitosamente');
            } else {
                console.log('✅ Dispositivo ya estaba abierto');
            }

            // Configurar canvas para mostrar la firma
            const canvas = wacomCanvasRef.current;
            if (!canvas) {
                throw new Error('Canvas no disponible');
            }

            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            console.log('🎨 Canvas configurado:', canvas.width + 'x' + canvas.height);

            let signaturePoints = [];
            let isDrawing = false;
            let lastX = -1;
            let lastY = -1;
            let reportCount = 0;
            let lastStatus = -1;

            // Resolución real del digitalizador STU-540 (PID=0xa8)
            // Los datos muestran X hasta ~10400, Y hasta ~5760
            const MAX_X = 10800;
            const MAX_Y = 6000;

            console.log('⚙️ STU-540 config: maxX=' + MAX_X + ' maxY=' + MAX_Y);

            // ═══════════════════════════════════════════════════════════
            // STU-540 (PID=0xa8) - Protocolo serial sobre HID
            //
            // Report ID=1, 63 bytes. Formato:
            //   Byte 0: status (0x80=hover, 0x81/0xC0/etc=tocando)
            //   Bytes 1-2: X (little-endian)
            //   Bytes 3-4: Y (little-endian)
            //   Bytes 5+: datos adicionales (no es presión válida)
            //
            // ESTRATEGIA DE DETECCIÓN DE TOQUE:
            //   Hover = status es EXACTAMENTE 0x80
            //   Toque = status tiene CUALQUIER bit adicional (no solo 0x80)
            //   Esto cubre: 0x81 (bit0), 0xC0 (bit6), 0x90 (bit4), etc.
            //   Si NO funciona, los logs mostrarán los status reales.
            // ═══════════════════════════════════════════════════════════
            const procesarDatosHID = (event) => {
                reportCount++;
                const data = new Uint8Array(event.data.buffer);

                if (data.length < 5) return;

                const status = data[0];
                const x = data[1] | (data[2] << 8);
                const y = data[3] | (data[4] << 8);

                // ── Log CUALQUIER cambio de status (CRÍTICO para debug) ──
                if (status !== lastStatus) {
                    console.log(`🔔 STATUS CAMBIÓ: 0x${lastStatus.toString(16)} → 0x${status.toString(16)} (report #${reportCount}) x=${x} y=${y}`);
                    console.log(`   Bits: b7=${(status>>7)&1} b6=${(status>>6)&1} b5=${(status>>5)&1} b4=${(status>>4)&1} b3=${(status>>3)&1} b2=${(status>>2)&1} b1=${(status>>1)&1} b0=${status&1}`);
                    // Log bytes completos cuando cambia status
                    const hex = Array.from(data.slice(0, 20)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ');
                    console.log(`   Raw: ${hex}`);
                    lastStatus = status;
                }

                // Log primeros reportes
                if (reportCount <= 5) {
                    const hex = Array.from(data.slice(0, 20)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ');
                    console.log(`📊 Report #${reportCount} | ID=${event.reportId} len=${data.length} | ${hex}`);
                }

                // ── Pen NO está en rango → fin de trazo ──
                if (!(status & 0x80)) {
                    if (isDrawing) {
                        isDrawing = false;
                        ctx.stroke();
                    }
                    return;
                }

                // Validar coordenadas
                if (x > MAX_X || y > MAX_Y) return;
                if (x === 0 && y === 0) return;

                // ══════════════════════════════════════════════════
                // DETECCIÓN DE TOQUE:
                // Hover puro = 0x80 exactamente (solo bit 7 = proximidad)
                // Contacto = status tiene CUALQUIER otro bit activo
                // Ejemplos: 0x81, 0x90, 0xC0, 0xA0, 0x84, etc.
                // ══════════════════════════════════════════════════
                const isHoverOnly = (status === 0x80);

                if (isHoverOnly) {
                    // Pen está cerca pero NO toca → no dibujar
                    if (isDrawing) {
                        isDrawing = false;
                        ctx.stroke();
                    }
                    return;
                }

                // ── Pen está TOCANDO la superficie → DIBUJAR ──
                const canvasX = (x / MAX_X) * canvas.width;
                const canvasY = (y / MAX_Y) * canvas.height;

                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2.5;

                if (!isDrawing) {
                    isDrawing = true;
                    ctx.beginPath();
                    ctx.moveTo(canvasX, canvasY);
                    lastX = canvasX;
                    lastY = canvasY;
                } else {
                    const dx = canvasX - lastX;
                    const dy = canvasY - lastY;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist > 1.5) {
                        const midX = (lastX + canvasX) / 2;
                        const midY = (lastY + canvasY) / 2;
                        ctx.quadraticCurveTo(lastX, lastY, midX, midY);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(midX, midY);
                        lastX = canvasX;
                        lastY = canvasY;
                    }
                }

                // Guardar punto
                signaturePoints.push({
                    x, y,
                    timestamp: now,
                    canvas_x: canvasX,
                    canvas_y: canvasY,
                    raw_status: status
                });
            };

            // Escuchar eventos del dispositivo
            console.log('👂 Configurando listeners para STU-540...');
            selectedDevice.addEventListener('inputreport', procesarDatosHID);

            // NUEVO: También escuchar eventos de connect/disconnect
            selectedDevice.addEventListener('connect', () => {
                console.log('🔌 STU-540 conectado');
            });

            selectedDevice.addEventListener('disconnect', () => {
                console.log('🔌 STU-540 desconectado');
            });

            // NUEVO: Verificar que el listener está configurado
            console.log('👂 Event listeners configurados');
            console.log('🔍 Dispositivo info completa:', {
                opened: selectedDevice.opened,
                vendorId: selectedDevice.vendorId,
                productId: selectedDevice.productId,
                productName: selectedDevice.productName,
                collections: selectedDevice.collections
            });

            // NUEVO: Probar envío de comando para activar reporte
            try {
                console.log('📤 Enviando comando de activación...');
                // Comando para activar reportes en STU-540
                const activateCommand = new Uint8Array([0x02, 0x01]);
                await selectedDevice.sendFeatureReport(0x02, activateCommand);
                console.log('✅ Comando de activación enviado');
            } catch (activateError) {
                console.log('⚠️ No se pudo enviar comando de activación:', activateError.message);
            }

            // NUEVO: Test inicial para verificar comunicación
            console.log('🧪 Iniciando test de comunicación...');
            let testTimeout = setTimeout(() => {
                if (reportCount === 0) {
                    console.log('⚠️ No se han recibido reportes después de 3 segundos');
                    console.log('💡 Intente mover el pen sobre la tablet o tocar la pantalla');
                    setSuccess('✍️ Toque la pantalla de su STU-540 con el pen para comenzar. Si no aparecen datos en consola, puede haber un problema de comunicación.');
                }
            }, 3000);

            // Mostrar instrucciones específicas para STU-540
            setSuccess('✍️ TOQUE la pantalla LCD de su STU-540 con el pen. Debe aparecer actividad en la consola.');

            // Crear promesa para manejar la captura
            return new Promise((resolve, reject) => {
                let timeoutId;

                const finalizarCaptura = async () => {
                    clearTimeout(timeoutId);
                    clearTimeout(testTimeout);
                    selectedDevice.removeEventListener('inputreport', procesarDatosHID);
                    
                    console.log(`📊 Finalizando captura. Total puntos: ${signaturePoints.length}`);
                    
                    if (signaturePoints.length > 10) {
                        // Limpiar pantalla del STU-540 al finalizar
                        await limpiarPantallaSTU();
                        
                        // Convertir canvas a imagen base64
                        const signatureBase64 = canvas.toDataURL('image/png');
                        
                        const resultado = {
                            signature_base64: signatureBase64,
                            tipo_firma: 'wacom',
                            device_info: {
                                device: `${selectedDevice.productName} (STU-540)`,
                                productId: selectedDevice.productId,
                                vendorId: selectedDevice.vendorId,
                                biometric: true,
                                points_count: signaturePoints.length,
                                timestamp: new Date().toISOString(),
                                resolution: `${STU540_CONFIG.width}x${STU540_CONFIG.height}`,
                                max_pressure: STU540_CONFIG.maxPressure,
                                total_reports: reportCount
                            },
                            points: signaturePoints.slice(0, 200) // Más puntos para mejor calidad
                        };
                        
                        console.log('✅ Firma STU-540 capturada exitosamente:', {
                            puntos: resultado.device_info.points_count,
                            reportes_totales: reportCount,
                            tamaño_imagen: signatureBase64.length
                        });
                        
                        resolve(resultado);
                    } else {
                        reject(new Error(`Firma muy corta. Solo se capturaron ${signaturePoints.length} puntos (mínimo 10).`));
                    }
                };

                const cancelarCaptura = async () => {
                    clearTimeout(timeoutId);
                    clearTimeout(testTimeout);
                    selectedDevice.removeEventListener('inputreport', procesarDatosHID);
                    await limpiarPantallaSTU();
                    reject(new Error('Captura cancelada'));
                };

                // Manejar teclas
                const manejarTeclas = (event) => {
                    if (event.key === 'Enter') {
                        document.removeEventListener('keydown', manejarTeclas);
                        finalizarCaptura();
                    } else if (event.key === 'Escape') {
                        document.removeEventListener('keydown', manejarTeclas);
                        cancelarCaptura();
                    }
                };

                document.addEventListener('keydown', manejarTeclas);

                // Timeout de 120 segundos para STU-540
                timeoutId = setTimeout(() => {
                    document.removeEventListener('keydown', manejarTeclas);
                    reject(new Error(`Tiempo agotado. Se recibieron ${reportCount} reportes y ${signaturePoints.length} puntos.`));
                }, 120000);

                // Agregar botones virtuales para confirmar/cancelar
                const buttonsContainer = document.createElement('div');
                buttonsContainer.className = 'fixed top-4 right-4 z-50 flex gap-2';
                buttonsContainer.innerHTML = `
                    <button id="confirm-signature" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        ✅ Confirmar Firma (${signaturePoints.length} puntos)
                    </button>
                    <button id="cancel-signature" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                        ❌ Cancelar
                    </button>
                    <button id="test-device" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        🧪 Test Comunicación
                    </button>
                `;
                document.body.appendChild(buttonsContainer);

                // Actualizar contador de puntos en tiempo real
                const updatePointCounter = () => {
                    const confirmBtn = document.getElementById('confirm-signature');
                    if (confirmBtn) {
                        confirmBtn.innerHTML = `✅ Confirmar Firma (${signaturePoints.length} puntos)`;
                    }
                };

                // Actualizar cada segundo
                const counterInterval = setInterval(updatePointCounter, 1000);

                // Event listeners para botones
                document.getElementById('confirm-signature').onclick = () => {
                    clearInterval(counterInterval);
                    document.body.removeChild(buttonsContainer);
                    document.removeEventListener('keydown', manejarTeclas);
                    finalizarCaptura();
                };

                document.getElementById('cancel-signature').onclick = () => {
                    clearInterval(counterInterval);
                    document.body.removeChild(buttonsContainer);
                    document.removeEventListener('keydown', manejarTeclas);
                    cancelarCaptura();
                };

                document.getElementById('test-device').onclick = () => {
                    console.log('🧪 TEST MANUAL - Estado actual:');
                    console.log('📊 Reportes recibidos:', reportCount);
                    console.log('📍 Puntos capturados:', signaturePoints.length);
                    console.log('🔌 Dispositivo abierto:', selectedDevice.opened);
                    console.log('👂 Listeners activos:', selectedDevice.oninputreport ? 'SÍ' : 'NO');
                    
                    // Test de comunicación
                    selectedDevice.sendFeatureReport(0x01, new Uint8Array([0x00]))
                        .then(() => console.log('✅ Test de comunicación OK'))
                        .catch(err => console.log('❌ Test de comunicación FALLÓ:', err));
                };
            });

        } catch (error) {
            console.error('❌ Error capturando firma STU-540:', error);
            throw error;
        } finally {
            setIsCapturingWacom(false);
        }
    };

    // Limpiar recursos Wacom
    const limpiarWacom = () => {
        if (wacomDevices.length > 0) {
            wacomDevices.forEach(device => {
                if (device.opened) {
                    device.close().catch(console.error);
                }
            });
        }
    };

    const cargarContratoParaFirma = async () => {
        try {
            setLoading(true);
            setError('');
            setPdfCargado(false);

            console.log('📋 Cargando contrato para firma...');

            if (!contratoId || isNaN(contratoId)) {
                throw new Error('ID de contrato inválido');
            }

            const contratosService = await import('../../services/contratosService');
            const service = contratosService.default;

            const response = await service.cargarContratoParaFirma(contratoId);

            if (response.success && response.data) {
                setContratoData(response.data);

                const urlPDF = response.data.pdf_url;
                
                if (urlPDF) {
                    console.log('🔗 URL del PDF recibida');
                    setPdfUrl(urlPDF);
                    setPdfCargado(true);
                } else {
                    throw new Error('No se pudo generar la URL del PDF');
                }

                setDatosSignature(prev => ({
                    ...prev,
                    firmado_por: response.data.cliente_nombre || '',
                    cedula_firmante: response.data.cliente_identificacion || ''
                }));
                
            } else {
                throw new Error(response.message || 'Error cargando contrato');
            }
        } catch (error) {
            console.error('❌ Error cargando contrato:', error);
            setError('Error cargando contrato: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const limpiarFirma = () => {
        // Limpiar canvas normal
        if (sigCanvas.current) {
            sigCanvas.current.clear();
        }
        
        // Limpiar canvas Wacom completamente
        if (wacomCanvasRef.current) {
            const ctx = wacomCanvasRef.current.getContext('2d');
            let isDrawing = false;
            
            // Limpiar completamente el canvas
            ctx.clearRect(0, 0, wacomCanvasRef.current.width, wacomCanvasRef.current.height);
            
            // Restaurar configuración del canvas
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, wacomCanvasRef.current.width, wacomCanvasRef.current.height);
            
            // Resetear estado de dibujo
            isDrawing = false;
            
            console.log('🧹 Canvas limpiado completamente');
        }
        
        // Limpiar pantalla STU-540 con comando mejorado
        if (selectedDevice && selectedDevice.opened && selectedDevice.productName.includes('STU-540')) {
            limpiarPantallaSTU540Mejorado();
        }
        
        setError('');
        setSuccess('');
    };

    // Función mejorada para limpiar pantalla del STU-540
    const limpiarPantallaSTU540Mejorado = async () => {
        try {
            if (!selectedDevice || !selectedDevice.opened) {
                console.log('⚠️ Dispositivo no disponible para limpiar');
                return;
            }

            console.log('🧹 Intentando limpiar pantalla STU-540...');
            
            // Comandos específicos para STU-540 basados en documentación Wacom
            const clearCommands = [
                // Comando 1: Clear screen básico
                { reportId: 0x01, data: new Uint8Array([0x00]) },
                
                // Comando 2: Clear con parámetros
                { reportId: 0x02, data: new Uint8Array([0x01, 0x00]) },
                
                // Comando 3: Reset display
                { reportId: 0x03, data: new Uint8Array([0x00, 0x00, 0x00, 0x00]) },
                
                // Comando 4: Feature report para clear
                { reportId: 0x01, data: new Uint8Array([0x01, 0x01]), isFeature: true },
                
                // Comando 5: Clear específico STU-540
                { reportId: 0x02, data: new Uint8Array([0x00, 0x01, 0x00, 0x00]), isFeature: true }
            ];
            
            let clearSuccess = false;
            
            for (const cmd of clearCommands) {
                try {
                    console.log(`🧪 Probando comando: ReportID=${cmd.reportId}, Data=[${Array.from(cmd.data).map(b => '0x' + b.toString(16)).join(', ')}], Feature=${cmd.isFeature || false}`);
                    
                    if (cmd.isFeature) {
                        await selectedDevice.sendFeatureReport(cmd.reportId, cmd.data);
                    } else {
                        await selectedDevice.sendReport(cmd.reportId, cmd.data);
                    }
                    
                    console.log('✅ Comando enviado exitosamente');
                    clearSuccess = true;
                    
                    // Dar tiempo para que el comando se procese
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    break; // Si funciona, no probar más
                    
                } catch (cmdError) {
                    console.log(`❌ Comando falló: ${cmdError.message}`);
                    continue; // Probar siguiente comando
                }
            }
            
            if (clearSuccess) {
                console.log('🧹 ¡Pantalla STU-540 limpiada exitosamente!');
                setSuccess('✅ Pantalla de la tablet limpiada');
            } else {
                console.log('⚠️ No se pudo limpiar la pantalla - pero la funcionalidad continúa');
                setSuccess('⚠️ Canvas limpiado (pantalla tablet no pudo limpiarse)');
            }
            
        } catch (error) {
            console.log('⚠️ Error general limpiando pantalla STU-540:', error.message);
            setSuccess('⚠️ Canvas limpiado (error en comando tablet)');
        }
    };

    const manejarSubidaImagen = (event) => {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setError('La imagen no debe superar 2MB');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                setDatosSignature(prev => ({
                    ...prev,
                    signature_base64: e.target.result
                }));
                setError('');
            };
            reader.readAsDataURL(file);
        }
    };

    const procesarFirma = async () => {
        try {
            if (!datosSignature.firmado_por.trim()) {
                setError('Debe especificar el nombre del firmante');
                return;
            }

            if (!datosSignature.cedula_firmante.trim()) {
                setError('Debe especificar la cédula del firmante');
                return;
            }

            let signatureData = null;

            // Capturar firma según el modo
            if (modoFirma === 'wacom') {
                try {
                    signatureData = await capturarFirmaWacom();
                } catch (error) {
                    setError('Error capturando firma Wacom: ' + error.message);
                    return;
                }
            } else if (modoFirma === 'digital') {
                if (sigCanvas.current && sigCanvas.current.isEmpty()) {
                    setError('Debe firmar en el área designada');
                    return;
                }
                signatureData = {
                    signature_base64: sigCanvas.current.toDataURL(),
                    tipo_firma: 'digital'
                };
            } else if (modoFirma === 'imagen') {
                if (!datosSignature.signature_base64) {
                    setError('Debe subir una imagen de firma');
                    return;
                }
                signatureData = {
                    signature_base64: datosSignature.signature_base64,
                    tipo_firma: 'imagen'
                };
            }

            if (!signatureData) {
                setError('Error obteniendo datos de firma');
                return;
            }

            setProcesandoFirma(true);
            setError('');

            console.log('🖊️ Procesando firma...');

            const contratosService = await import('../../services/contratosService');
            const service = contratosService.default;

            // Preparar datos para el backend (usando campos existentes de la BD)
            const datosParaEnviar = {
                signature_base64: signatureData.signature_base64,
                firmado_por: datosSignature.firmado_por.trim(),
                cedula_firmante: datosSignature.cedula_firmante.trim(),
                tipo_firma: signatureData.tipo_firma,
                observaciones: `${datosSignature.observaciones || ''}${signatureData.device_info ? ` [Wacom: ${signatureData.device_info.device}, Puntos: ${signatureData.device_info.points_count}]` : ''}`
            };

            const response = await service.procesarFirmaDigital(contratoId, datosParaEnviar);

            if (response.success) {
                setSuccess('✅ ¡Contrato firmado exitosamente!');

                // Mostrar información adicional si es Wacom
                if (signatureData.device_info) {
                    console.log('📱 Firma Wacom procesada:', {
                        dispositivo: signatureData.device_info.device,
                        puntos: signatureData.device_info.points_count,
                        biometrica: signatureData.device_info.biometric
                    });
                }

                setTimeout(() => {
                    if (onFirmaCompleta) {
                        onFirmaCompleta({
                            ...response.data,
                            wacom_usado: signatureData.tipo_firma === 'wacom',
                            dispositivo: signatureData.device_info?.device || null
                        });
                    }
                }, 1500);
            } else {
                throw new Error(response.message || 'Error procesando la firma');
            }

        } catch (error) {
            console.error('❌ Error procesando firma:', error);
            setError('Error procesando firma: ' + error.message);
        } finally {
            setProcesandoFirma(false);
        }
    };

    const abrirPDFEnNuevaVentana = () => {
        if (pdfUrl) {
            const token = localStorage.getItem('token');
            
            fetch(pdfUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/pdf'
                }
            })
            .then(response => response.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
                setTimeout(() => window.URL.revokeObjectURL(url), 1000);
            })
            .catch(error => {
                console.error('Error abriendo PDF:', error);
                window.open(pdfUrl, '_blank');
            });
        }
    };

    const descargarPDF = () => {
        if (pdfUrl) {
            const token = localStorage.getItem('token');
            
            fetch(pdfUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/pdf'
                }
            })
            .then(response => response.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `contrato_${contratoData.numero_contrato || contratoId}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            })
            .catch(error => {
                console.error('Error descargando PDF:', error);
                setError('Error descargando el PDF');
            });
        }
    };

    // NUEVO: Verificar que el PDF se puede cargar correctamente
    const verificarPDF = async (url) => {
        try {
            console.log('🔍 Verificando disponibilidad del PDF...');
            
            const contratosService = await import('../../services/contratosService');
            const service = contratosService.default;
            
            const verificacion = await service.verificarPDF(contratoId);
            
            if (verificacion.disponible) {
                const contentType = verificacion.contentType;
                if (contentType && contentType.includes('application/pdf')) {
                    setPdfCargado(true);
                    console.log('✅ PDF verificado exitosamente');
                } else {
                    throw new Error('El archivo no es un PDF válido');
                }
            } else {
                throw new Error(verificacion.error || 'PDF no disponible');
            }
        } catch (error) {
            console.error('❌ Error verificando PDF:', error);
            setError('Error cargando el PDF del contrato: ' + error.message);
            setPdfCargado(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">Cargando contrato...</span>
            </div>
        );
    }

    if (error && !pdfCargado) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                    <h3 className="text-lg font-semibold text-red-800">
                        Error al cargar el contrato
                    </h3>
                </div>
                <p className="text-red-700 mb-4">{error}</p>
                <div className="flex gap-3">
                    <button
                        onClick={cargarContratoParaFirma}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Reintentar
                    </button>
                    {onCancelar && (
                        <button
                            onClick={onCancelar}
                            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                            Cancelar
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (contratoData.firmado) {
        const verPDFFirmado = () => {
            if (pdfUrl) {
                abrirPDFEnNuevaVentana();
            } else {
                // Fallback: abrir directamente desde la API
                const token = localStorage.getItem('token');
                const apiUrl = process.env.NODE_ENV === 'development'
                    ? (process.env.REACT_APP_API_URL || 'http://45.173.69.5:3000/api/v1')
                    : process.env.REACT_APP_API_URL;
                window.open(`${apiUrl}/contratos/${contratoId}/pdf?token=${encodeURIComponent(token)}`, '_blank');
            }
        };

        return (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Check className="h-6 w-6 text-green-600" />
                    <h3 className="text-lg font-semibold text-green-800">
                        Contrato ya firmado
                    </h3>
                </div>
                <p className="text-green-700 mb-4">
                    Este contrato ya ha sido firmado digitalmente.
                    {contratoData.fecha_firma && (
                        <span className="block text-sm mt-1">
                            Fecha de firma: {new Date(String(contratoData.fecha_firma).substring(0,10) + 'T12:00:00').toLocaleDateString('es-CO')}
                        </span>
                    )}
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={verPDFFirmado}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Eye className="h-4 w-4" />
                        Ver PDF Firmado
                    </button>
                    <button
                        onClick={pdfUrl ? descargarPDF : verPDFFirmado}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Download className="h-4 w-4" />
                        Descargar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 bg-white">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Firma Digital de Contrato
                </h2>
                <p className="text-gray-600">
                    Contrato: {contratoData.numero_contrato} - Cliente: {contratoData.cliente_nombre}
                </p>
                
                {/* Estado de Wacom */}
                <div className="mt-2 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        {wacomAvailable ? (
                            <>
                                <Wifi className="h-4 w-4 text-green-600" />
                                <span className="text-sm text-green-600">
                                    Wacom: {selectedDevice?.productName}
                                </span>
                            </>
                        ) : (
                            <>
                                <WifiOff className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-500">Sin tablet Wacom</span>
                            </>
                        )}
                    </div>
                    
                    {!wacomAvailable && navigator.hid && (
                        <button
                            onClick={solicitarAccesoWacom}
                            className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                            Conectar Wacom
                        </button>
                    )}
                </div>
            </div>

            {success && (
                <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                    {success}
                </div>
            )}

            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Visor de PDF */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Documento del Contrato
                        </h3>
                        <div className="flex gap-2">
                            <button
                                onClick={abrirPDFEnNuevaVentana}
                                className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                            >
                                <Eye className="h-4 w-4" />
                                Abrir
                            </button>
                            <button
                                onClick={descargarPDF}
                                className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                <Download className="h-4 w-4" />
                                Descargar
                            </button>
                        </div>
                    </div>

                    <div className="border rounded-lg overflow-hidden bg-gray-50">
                        {pdfCargado && pdfUrl ? (
                            <iframe
                                src={pdfUrl}
                                className="w-full h-96 lg:h-[600px]"
                                title="Contrato PDF"
                                style={{ border: 'none' }}
                                onLoad={() => {
                                    console.log('✅ PDF cargado en iframe');
                                }}
                                onError={() => {
                                    console.error('❌ Error cargando PDF en iframe');
                                    setError('Error mostrando el PDF. Use el botón "Abrir en nueva ventana".');
                                    setPdfCargado(false);
                                }}
                            />
                        ) : (
                            <div className="h-96 lg:h-[600px] flex items-center justify-center">
                                <div className="text-center">
                                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600">
                                        {loading ? 'Cargando PDF...' : 'PDF no disponible'}
                                    </p>
                                    {!loading && pdfUrl && (
                                        <button
                                            onClick={abrirPDFEnNuevaVentana}
                                            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            Abrir PDF en nueva ventana
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Panel de Firma */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Área de Firma Digital
                    </h3>

                    {/* Datos del firmante */}
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Observaciones
                            </label>
                            <textarea
                                value={datosSignature.observaciones}
                                onChange={(e) => setDatosSignature(prev => ({
                                    ...prev,
                                    observaciones: e.target.value
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                rows="2"
                                placeholder="Comentarios adicionales..."
                            />
                        </div>
                    </div>

                    {/* Selector de modo de firma */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tipo de firma
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {wacomAvailable && (
                                <button
                                    onClick={() => setModoFirma('wacom')}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                        modoFirma === 'wacom'
                                            ? 'bg-green-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    <Tablet className="h-4 w-4" />
                                    Wacom
                                </button>
                            )}
                            <button
                                onClick={() => setModoFirma('digital')}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                    modoFirma === 'digital'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                <PenTool className="h-4 w-4" />
                                Digital
                            </button>
                            <button
                                onClick={() => setModoFirma('imagen')}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                    modoFirma === 'imagen'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                <Upload className="h-4 w-4" />
                                Imagen
                            </button>
                        </div>
                    </div>

                    {/* Área de firma según el modo */}
                    {modoFirma === 'wacom' ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Firma con Tablet Wacom
                                {wacomAvailable && (
                                    <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-green-600">
                                        <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
                                        Conectada
                                    </span>
                                )}
                            </label>

                            {!wacomAvailable ? (
                                // Tablet no conectada — mostrar instrucciones prominentes
                                <div className="border-2 border-dashed border-orange-300 rounded-lg p-6 bg-orange-50 text-center">
                                    <div className="text-3xl mb-2">🖊️</div>
                                    <p className="text-sm font-medium text-orange-800 mb-1">Tablet Wacom no conectada</p>
                                    <p className="text-xs text-orange-600 mb-3">Conecte su tablet por USB y haga clic en "Conectar Wacom"</p>
                                    <button
                                        type="button"
                                        onClick={solicitarAccesoWacom}
                                        className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                                    >
                                        🔌 Conectar Wacom ahora
                                    </button>
                                    <p className="text-xs text-orange-500 mt-2">Requiere Chrome o Edge con la tablet conectada por USB</p>
                                </div>
                            ) : (
                                // Tablet conectada — mostrar canvas
                                <div className="border-2 border-dashed border-green-300 rounded-lg p-4 bg-green-50">
                                    <canvas
                                        ref={wacomCanvasRef}
                                        width={800}
                                        height={480}
                                        className="w-full border rounded bg-white mx-auto block"
                                        style={{ aspectRatio: '5/3', maxHeight: '300px' }}
                                    />
                                    {!isCapturingWacom && (
                                        <p className="text-center text-sm text-green-700 mt-2">
                                            ✅ Tablet lista — haga clic en <strong>"Firmar"</strong> para iniciar la captura
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="mt-2 text-sm text-gray-600 space-y-0.5">
                                <p>📝 Firme directamente en la pantalla de su tablet</p>
                                <p>⌨️ <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Enter</kbd> confirmar · <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Esc</kbd> cancelar</p>
                            </div>
                            {isCapturingWacom && (
                                <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 text-sm animate-pulse">
                                    🖊️ Capturando firma en tablet... Firme ahora en la pantalla de su Wacom.
                                </div>
                            )}
                        </div>
                    ) : modoFirma === 'digital' ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Firma digital (mouse/touch)
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-2">
                                <SignaturePad
                                    ref={sigCanvas}
                                    width={400}
                                    height={160}
                                    backgroundColor="rgb(255,255,255)"
                                    penColor="#1a1a2e"
                                    minWidth={1.5}
                                    maxWidth={4}
                                    className="w-full border rounded bg-white"
                                />
                            </div>
                            <p className="mt-1 text-sm text-gray-600">
                                ✍️ Firme con el mouse, dedo o stylus
                            </p>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Subir imagen de firma
                            </label>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={manejarSubidaImagen}
                                accept="image/*"
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
                            >
                                <Upload className="h-8 w-8 mx-auto mb-2" />
                                Seleccionar imagen
                                <br />
                                <span className="text-sm">PNG, JPG (máx. 2MB)</span>
                            </button>
                            {datosSignature.signature_base64 && (
                                <div className="mt-3">
                                    <img
                                        src={datosSignature.signature_base64}
                                        alt="Firma"
                                        className="max-w-full h-20 border rounded object-contain mx-auto"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Botones de acción */}
                    <div className="flex gap-3">
                        <button
                            onClick={limpiarFirma}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            disabled={procesandoFirma || isCapturingWacom}
                        >
                            <RotateCcw className="h-4 w-4" />
                            Limpiar
                        </button>
                        
                        <button
                            onClick={procesarFirma}
                            disabled={procesandoFirma || isCapturingWacom}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {procesandoFirma || isCapturingWacom ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    {isCapturingWacom ? 'Capturando...' : 'Procesando...'}
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Confirmar Firma
                                </>
                            )}
                        </button>
                    </div>

                    {/* Información adicional */}
                    <div className="text-xs text-gray-500 space-y-1">
                        {modoFirma === 'wacom' && (
                            <p>🎨 Firma biométrica con captura de presión y velocidad</p>
                        )}
                        {modoFirma === 'digital' && (
                            <p>🖱️ Firma digital básica sin datos biométricos</p>
                        )}
                        {modoFirma === 'imagen' && (
                            <p>📁 Firma desde archivo de imagen existente</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VisorFirmaPDF;