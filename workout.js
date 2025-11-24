// API Configuration
const API_URL = 'http://localhost:3000/api';
let currentRoutineId = null;
let currentRoutineData = null;
let workoutStartTime = null;
let workoutTimerInterval = null;
let restTimerInterval = null;
let restTimeRemaining = 0;

// ========================================
// INICIALIZACIÓN
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    // Obtener el ID de la rutina de la URL
    const urlParams = new URLSearchParams(window.location.search);
    currentRoutineId = urlParams.get('id');
    
    if (!currentRoutineId) {
        showMessage('No se especificó una rutina para iniciar', 'error');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        return;
    }
    
    loadUserName();
    loadRoutineData();
    startWorkoutTimer();
});

// ========================================
// AUTENTICACIÓN
// ========================================

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
    }
}

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    };
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

function loadUserName() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.nombre) {
        document.getElementById('userName').textContent = user.nombre;
    }
}

// ========================================
// SIDEBAR TOGGLE (si lo necesitas)
// ========================================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar && overlay) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }
}

// ========================================
// CARGAR DATOS DE LA RUTINA
// ========================================

async function loadRoutineData() {
    try {
        const response = await fetch(`${API_URL}/rutinas/${currentRoutineId}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Error al cargar la rutina');
        }

        currentRoutineData = await response.json();
        
        // Mostrar nombre de la rutina
        document.getElementById('routineName').textContent = currentRoutineData.rutina.nombre;
        
        // Procesar y mostrar ejercicios
        displayExercises();
        updateProgressCounter();
        
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error al cargar la rutina', 'error');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
    }
}

// ========================================
// MOSTRAR EJERCICIOS
// ========================================

function displayExercises() {
    const container = document.getElementById('exercisesContainer');
    
    if (!currentRoutineData || !currentRoutineData.series || currentRoutineData.series.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💪</div>
                <h3>Esta rutina no tiene ejercicios</h3>
                <p>Edita la rutina para agregar ejercicios</p>
                <button class="btn-primary" onclick="window.location.href='dashboard.html'">
                    Volver al Dashboard
                </button>
            </div>
        `;
        return;
    }
    
    // Agrupar series por ejercicio
    const exerciseGroups = {};
    currentRoutineData.series.forEach(serie => {
        const key = serie.id_ejercicio;
        if (!exerciseGroups[key]) {
            exerciseGroups[key] = {
                id_ejercicio: serie.id_ejercicio,
                nombre: serie.ejercicio_nombre,
                grupo_muscular: serie.grupo_muscular,
                series: []
            };
        }
        exerciseGroups[key].series.push(serie);
    });
    
    // Renderizar ejercicios
    const exercisesArray = Object.values(exerciseGroups);
    container.innerHTML = exercisesArray.map((exercise, index) => `
        <div class="workout-exercise-card" id="exercise-${exercise.id_ejercicio}">
            <div class="workout-exercise-header">
                <div class="workout-exercise-info">
                    <h3>${exercise.nombre}</h3>
                    <span class="workout-exercise-muscle">${exercise.grupo_muscular || 'General'}</span>
                </div>
                <div class="workout-exercise-number">${index + 1}</div>
            </div>
            
            <div class="workout-series-list">
                ${exercise.series.map((serie, serieIndex) => `
                    <div class="workout-serie-item" id="serie-item-${serie.id_serie}">
                        <div class="workout-serie-left">
                            <span class="workout-serie-number">Serie ${serie.numero_serie}</span>
                            <div class="workout-serie-inputs">
                                <div class="workout-input-group">
                                    <input 
                                        type="number" 
                                        class="workout-serie-input" 
                                        id="reps-${serie.id_serie}"
                                        placeholder="Reps" 
                                        value="${serie.repeticiones}"
                                        onchange="updateSerieValue(${serie.id_serie}, 'repeticiones', this.value)">
                                    <label>reps</label>
                                </div>
                                <div class="workout-input-group">
                                    <input 
                                        type="number" 
                                        step="0.5" 
                                        class="workout-serie-input" 
                                        id="peso-${serie.id_serie}"
                                        placeholder="Peso" 
                                        value="${serie.peso_usado || ''}"
                                        onchange="updateSerieValue(${serie.id_serie}, 'peso_usado', this.value)">
                                    <label>kg</label>
                                </div>
                            </div>
                        </div>
                        <div class="workout-serie-checkbox">
                            <input 
                                type="checkbox" 
                                id="check-${serie.id_serie}"
                                onchange="toggleSerieComplete(${serie.id_serie}, ${exercise.id_ejercicio}, ${serieIndex}, ${exercise.series.length})">
                            <label for="check-${serie.id_serie}">
                                Completar
                            </label>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="workout-exercise-notes">
                <textarea 
                    placeholder="Notas del ejercicio (opcional)..." 
                    id="notes-${exercise.id_ejercicio}"></textarea>
            </div>
        </div>
    `).join('');
}

// ========================================
// ACTUALIZAR VALORES DE SERIE
// ========================================

function updateSerieValue(serieId, field, value) {
    // Buscar y actualizar en el objeto local
    const serie = currentRoutineData.series.find(s => s.id_serie === serieId);
    if (serie) {
        if (field === 'repeticiones') {
            serie.repeticiones = parseInt(value) || 0;
        } else if (field === 'peso_usado') {
            serie.peso_usado = parseFloat(value) || null;
        }
    }
}

// ========================================
// COMPLETAR SERIE
// ========================================

function toggleSerieComplete(serieId, exerciseId, serieIndex, totalSeries) {
    const checkbox = document.getElementById(`check-${serieId}`);
    const serieItem = document.getElementById(`serie-item-${serieId}`);
    
    if (checkbox.checked) {
        serieItem.classList.add('completed');
        
        // Guardar en historial
        saveToHistory(serieId);
        
        // Si es la última serie del ejercicio, marcar ejercicio como completado
        const allSeriesCompleted = checkIfExerciseCompleted(exerciseId);
        if (allSeriesCompleted) {
            markExerciseCompleted(exerciseId);
        }
        
        // Actualizar contador de progreso
        updateProgressCounter();
        
        // Iniciar descanso si no es la última serie
        if (serieIndex < totalSeries - 1) {
            const serie = currentRoutineData.series.find(s => s.id_serie === serieId);
            const nextSerie = currentRoutineData.series.find(s => 
                s.id_ejercicio === exerciseId && s.numero_serie === (serieIndex + 2)
            );
            startRestTimer(serie.descanso_segundos || 60, nextSerie);
        }
    } else {
        serieItem.classList.remove('completed');
        updateProgressCounter();
        
        // Si había ejercicio completado, quitarle la marca
        const exerciseCard = document.getElementById(`exercise-${exerciseId}`);
        if (exerciseCard) {
            exerciseCard.classList.remove('completed');
        }
    }
}

// ========================================
// VERIFICAR SI EJERCICIO ESTÁ COMPLETADO
// ========================================

function checkIfExerciseCompleted(exerciseId) {
    const exerciseSeries = currentRoutineData.series.filter(s => s.id_ejercicio === exerciseId);
    return exerciseSeries.every(serie => {
        const checkbox = document.getElementById(`check-${serie.id_serie}`);
        return checkbox && checkbox.checked;
    });
}

function markExerciseCompleted(exerciseId) {
    const exerciseCard = document.getElementById(`exercise-${exerciseId}`);
    if (exerciseCard) {
        exerciseCard.classList.add('completed');
    }
}

// ========================================
// GUARDAR EN HISTORIAL
// ========================================

async function saveToHistory(serieId) {
    try {
        const serie = currentRoutineData.series.find(s => s.id_serie === serieId);
        if (!serie) return;
        
        const repsInput = document.getElementById(`reps-${serieId}`);
        const pesoInput = document.getElementById(`peso-${serieId}`);
        
        const historialData = {
            id_ejercicio: serie.id_ejercicio,
            peso_usado: parseFloat(pesoInput.value) || 0,
            repeticiones: parseInt(repsInput.value) || 0,
            fecha_registro: new Date().toISOString().split('T')[0]
        };
        
        // Aquí puedes hacer una llamada al backend si tienes un endpoint para historial
        // await fetch(`${API_URL}/historial`, {
        //     method: 'POST',
        //     headers: getAuthHeaders(),
        //     body: JSON.stringify(historialData)
        // });
        
        console.log('Serie guardada en historial:', historialData);
        
    } catch (error) {
        console.error('Error al guardar en historial:', error);
    }
}

// ========================================
// CONTADOR DE PROGRESO
// ========================================

function updateProgressCounter() {
    const totalSeries = currentRoutineData.series.length;
    let completedSeries = 0;
    
    currentRoutineData.series.forEach(serie => {
        const checkbox = document.getElementById(`check-${serie.id_serie}`);
        if (checkbox && checkbox.checked) {
            completedSeries++;
        }
    });
    
    document.getElementById('completedSets').textContent = completedSeries;
    document.getElementById('totalSets').textContent = totalSeries;
}

// ========================================
// CRONÓMETRO DEL WORKOUT
// ========================================

function startWorkoutTimer() {
    workoutStartTime = Date.now();
    
    workoutTimerInterval = setInterval(() => {
        const elapsed = Date.now() - workoutStartTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        
        document.getElementById('workoutTimer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

// ========================================
// CRONÓMETRO DE DESCANSO
// ========================================

function startRestTimer(seconds, nextSerie) {
    restTimeRemaining = seconds;
    
    const restTimerContainer = document.getElementById('restTimer');
    const restTimerDisplay = document.getElementById('restTimerDisplay');
    const nextExerciseName = document.getElementById('nextExerciseName');
    
    restTimerContainer.classList.remove('hidden');
    
    if (nextSerie) {
        nextExerciseName.textContent = `${nextSerie.ejercicio_nombre} - Serie ${nextSerie.numero_serie}`;
    } else {
        nextExerciseName.textContent = 'Último ejercicio';
    }
    
    updateRestDisplay();
    
    restTimerInterval = setInterval(() => {
        restTimeRemaining--;
        
        if (restTimeRemaining <= 0) {
            stopRestTimer();
            // Opcional: reproducir sonido
            playBeep();
        } else {
            updateRestDisplay();
        }
    }, 1000);
}

function updateRestDisplay() {
    const minutes = Math.floor(restTimeRemaining / 60);
    const seconds = restTimeRemaining % 60;
    
    document.getElementById('restTimerDisplay').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function stopRestTimer() {
    if (restTimerInterval) {
        clearInterval(restTimerInterval);
        restTimerInterval = null;
    }
    document.getElementById('restTimer').classList.add('hidden');
}

function skipRest() {
    stopRestTimer();
}

function addRestTime(seconds) {
    restTimeRemaining += seconds;
    updateRestDisplay();
}

function playBeep() {
    // Crear un beep simple usando Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
        console.log('No se pudo reproducir el sonido');
    }
}

// ========================================
// FINALIZAR ENTRENAMIENTO
// ========================================

function confirmEndWorkout() {
    document.getElementById('confirmModal').style.display = 'flex';
}

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
}

async function finishWorkout() {
    try {
        // Detener cronómetros
        if (workoutTimerInterval) {
            clearInterval(workoutTimerInterval);
        }
        if (restTimerInterval) {
            clearInterval(restTimerInterval);
        }
        
        // Recopilar datos del workout
        const workoutDuration = Math.floor((Date.now() - workoutStartTime) / 1000);
        const totalSeries = currentRoutineData.series.length;
        let completedSeries = 0;
        
        currentRoutineData.series.forEach(serie => {
            const checkbox = document.getElementById(`check-${serie.id_serie}`);
            if (checkbox && checkbox.checked) {
                completedSeries++;
            }
        });
        
        // Aquí puedes hacer una llamada al backend para guardar el resumen del workout
        const workoutSummary = {
            id_rutina: currentRoutineId,
            fecha: new Date().toISOString(),
            duracion_segundos: workoutDuration,
            series_completadas: completedSeries,
            series_totales: totalSeries
        };
        
        console.log('Workout finalizado:', workoutSummary);
        
        closeConfirmModal();
        showMessage('¡Entrenamiento completado! 💪', 'success');
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        
    } catch (error) {
        console.error('Error al finalizar workout:', error);
        showMessage('Error al finalizar el entrenamiento', 'error');
    }
}

// ========================================
// MENSAJES
// ========================================

function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type} show`;
    
    setTimeout(() => {
        messageDiv.classList.remove('show');
    }, 3000);
}