// Configuración de la API
const API_URL = 'http://localhost:3000/api';

// Variables globales
let routineData = null;
let completedSets = 0;
let totalSets = 0;
let workoutStartTime = null;
let workoutTimerInterval = null;
let restTimerInterval = null;
let restEndTime = null;

// Verificar autenticación y cargar rutina
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    
    if (!token) {
        window.location.href = 'index.html';
        return;
    }
    
    // Mostrar nombre del usuario
    document.getElementById('userName').textContent = usuario.nombre || 'Usuario';
    
    // Obtener ID de la rutina de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const routineId = urlParams.get('id');
    
    if (!routineId) {
        showMessage('No se especificó una rutina', 'error');
        setTimeout(() => window.location.href = 'dashboard.html', 2000);
        return;
    }
    
    // Cargar la rutina
    loadRoutine(routineId);
    
    // Iniciar cronómetro del entrenamiento
    startWorkoutTimer();
});

// Cargar rutina completa con sus series
async function loadRoutine(routineId) {
    const token = localStorage.getItem('token');
    const container = document.getElementById('exercisesContainer');
    
    try {
        console.log('🔄 Cargando rutina ID:', routineId);
        
        const response = await fetch(`${API_URL}/rutinas/${routineId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401 || response.status === 403) {
            showMessage('No autorizado', 'error');
            setTimeout(() => window.location.href = 'index.html', 1500);
            return;
        }
        
        if (!response.ok) {
            throw new Error('Error al cargar la rutina');
        }
        
        routineData = await response.json();
        console.log('✅ Rutina cargada:', routineData);
        
        // Actualizar header
        document.getElementById('routineName').textContent = routineData.rutina.nombre;
        
        // Agrupar series por ejercicio
        const exercisesMap = {};
        routineData.series.forEach(serie => {
            if (!exercisesMap[serie.id_ejercicio]) {
                exercisesMap[serie.id_ejercicio] = {
                    id_ejercicio: serie.id_ejercicio,
                    nombre: serie.ejercicio_nombre,
                    grupo_muscular: serie.grupo_muscular,
                    series: []
                };
            }
            exercisesMap[serie.id_ejercicio].series.push(serie);
        });
        
        const exercises = Object.values(exercisesMap);
        totalSets = routineData.series.length;
        document.getElementById('totalSets').textContent = totalSets;
        
        // Renderizar ejercicios
        displayExercises(exercises);
        
    } catch (error) {
        console.error('❌ Error:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3>Error al cargar la rutina</h3>
                <p>${error.message}</p>
                <button class="btn-primary" onclick="window.location.href='dashboard.html'">
                    Volver al Dashboard
                </button>
            </div>
        `;
    }
}

// Mostrar ejercicios
function displayExercises(exercises) {
    const container = document.getElementById('exercisesContainer');
    
    container.innerHTML = exercises.map((exercise, exerciseIndex) => `
        <div class="workout-exercise-card" id="exercise-${exercise.id_ejercicio}">
            <div class="exercise-header-workout">
                <div>
                    <h3>${exercise.nombre}</h3>
                    <p class="exercise-muscle">${exercise.grupo_muscular || 'Sin grupo'}</p>
                </div>
                <div class="exercise-progress">
                    <span class="sets-completed" id="progress-${exercise.id_ejercicio}">
                        0/${exercise.series.length}
                    </span>
                </div>
            </div>
            
            <div class="workout-series-list">
                ${exercise.series.map((serie, serieIndex) => `
                    <div class="workout-serie-item" id="serie-${serie.id_serie}">
                        <div class="serie-info">
                            <span class="serie-badge">Serie ${serie.numero_serie}</span>
                            <span class="serie-details">
                                ${serie.repeticiones} reps × ${serie.peso_usado}kg
                            </span>
                        </div>
                        <div class="serie-actions">
                            <input 
                                type="number" 
                                class="serie-input-small" 
                                id="reps-${serie.id_serie}"
                                value="${serie.repeticiones}"
                                min="0"
                                placeholder="Reps">
                            <input 
                                type="number" 
                                class="serie-input-small" 
                                id="weight-${serie.id_serie}"
                                value="${serie.peso_usado}"
                                step="0.5"
                                min="0"
                                placeholder="Kg">
                            <button 
                                class="btn-complete-set" 
                                id="btn-${serie.id_serie}"
                                onclick="completeSet(${serie.id_serie}, ${serie.descanso_segundos}, ${exercise.id_ejercicio}, ${exercises.length}, ${exerciseIndex}, ${serieIndex}, ${exercise.series.length})">
                                ✓
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// Completar serie
function completeSet(serieId, restSeconds, exerciseId, totalExercises, exerciseIndex, serieIndex, totalSeriesInExercise) {
    const serieElement = document.getElementById(`serie-${serieId}`);
    const button = document.getElementById(`btn-${serieId}`);
    const repsInput = document.getElementById(`reps-${serieId}`);
    const weightInput = document.getElementById(`weight-${serieId}`);
    
    // Marcar como completado
    serieElement.classList.add('completed');
    button.disabled = true;
    button.textContent = '✓';
    button.style.background = '#10b981';
    
    // Deshabilitar inputs
    repsInput.disabled = true;
    weightInput.disabled = true;
    
    // Incrementar contador
    completedSets++;
    document.getElementById('completedSets').textContent = completedSets;
    
    // Actualizar progreso del ejercicio
    const exerciseProgress = document.querySelectorAll(`#exercise-${exerciseId} .workout-serie-item.completed`).length;
    document.getElementById(`progress-${exerciseId}`).textContent = `${exerciseProgress}/${totalSeriesInExercise}`;
    
    // Si el ejercicio está completo, marcarlo
    if (exerciseProgress === totalSeriesInExercise) {
        document.getElementById(`exercise-${exerciseId}`).classList.add('exercise-completed');
    }
    
    // Reproducir sonido de éxito (opcional)
    playSuccessSound();
    
    // Si no es la última serie, iniciar descanso
    if (completedSets < totalSets) {
        // Determinar el siguiente ejercicio
        let nextExerciseName = 'Próxima serie';
        if (serieIndex < totalSeriesInExercise - 1) {
            nextExerciseName = `Serie ${serieIndex + 2}`;
        } else if (exerciseIndex < totalExercises - 1) {
            const nextExercise = document.querySelectorAll('.workout-exercise-card')[exerciseIndex + 1];
            nextExerciseName = nextExercise.querySelector('h3').textContent;
        }
        
        startRestTimer(restSeconds, nextExerciseName);
    } else {
        // Todas las series completadas
        showMessage('¡Entrenamiento completado! 🎉', 'success');
        setTimeout(() => {
            confirmEndWorkout();
        }, 2000);
    }
}

// Cronómetro de entrenamiento total
function startWorkoutTimer() {
    workoutStartTime = Date.now();
    workoutTimerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - workoutStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        document.getElementById('workoutTimer').textContent = 
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);
}

// Cronómetro de descanso
function startRestTimer(seconds, nextExercise) {
    const restContainer = document.getElementById('restTimer');
    const restDisplay = document.getElementById('restTimerDisplay');
    const nextExerciseSpan = document.getElementById('nextExerciseName');
    
    restEndTime = Date.now() + (seconds * 1000);
    nextExerciseSpan.textContent = nextExercise;
    
    restContainer.classList.remove('hidden');
    restContainer.classList.add('show');
    
    // Reproducir sonido de inicio de descanso
    playRestSound();
    
    restTimerInterval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((restEndTime - Date.now()) / 1000));
        const minutes = Math.floor(remaining / 60);
        const secs = remaining % 60;
        
        restDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        
        if (remaining <= 0) {
            stopRestTimer();
            playCompleteSound();
        }
    }, 100);
}

// Detener cronómetro de descanso
function stopRestTimer() {
    if (restTimerInterval) {
        clearInterval(restTimerInterval);
        restTimerInterval = null;
    }
    
    const restContainer = document.getElementById('restTimer');
    restContainer.classList.remove('show');
    setTimeout(() => {
        restContainer.classList.add('hidden');
    }, 300);
}

// Saltar descanso
function skipRest() {
    stopRestTimer();
}

// Agregar tiempo al descanso
function addRestTime(seconds) {
    if (restEndTime) {
        restEndTime += seconds * 1000;
    }
}

// Sonidos (usando Web Audio API)
function playSuccessSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        console.log('Audio no soportado');
    }
}

function playRestSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 400;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
        console.log('Audio no soportado');
    }
}

function playCompleteSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        [600, 800].forEach((freq, i) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = freq;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime + i * 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.1 + 0.1);
            
            oscillator.start(audioContext.currentTime + i * 0.1);
            oscillator.stop(audioContext.currentTime + i * 0.1 + 0.1);
        });
    } catch (e) {
        console.log('Audio no soportado');
    }
}

// Finalizar entrenamiento
function confirmEndWorkout() {
    document.getElementById('confirmModal').classList.add('show');
}

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('show');
}

function finishWorkout() {
    // Detener cronómetros
    if (workoutTimerInterval) clearInterval(workoutTimerInterval);
    if (restTimerInterval) clearInterval(restTimerInterval);
    
    showMessage('Entrenamiento guardado correctamente', 'success');
    
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 1500);
}

function endWorkout() {
    if (confirm('¿Quieres salir del entrenamiento? El progreso se guardará.')) {
        finishWorkout();
    }
}

// Mostrar mensaje
function showMessage(message, type = 'error') {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = `message ${type} show`;
    
    setTimeout(() => {
        messageDiv.className = 'message';
    }, 5000);
}