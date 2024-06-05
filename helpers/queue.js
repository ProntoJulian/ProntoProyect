const Queue = require('bull');
const cron = require('node-cron');

// Crear una cola para tareas de sincronización
const syncQueue = new Queue('syncQueue');

// Función para definir el trabajo de sincronización
syncQueue.process(async (job, done) => {
    console.log('Processing job:', job.id);
    
    try {
        // Aquí va tu lógica de sincronización
        console.log('Synchronizing feeds...');
        // Simular una tarea larga
        setTimeout(() => {
            console.log('Feed synchronized successfully');
            done();
        }, 5000); // Simula una tarea que toma 5 segundos
    } catch (error) {
        done(new Error('Synchronization failed'));
    }
});

// Manejar eventos de la cola
syncQueue.on('completed', (job, result) => {
    console.log(`Job ${job.id} completed successfully`);
});

syncQueue.on('failed', (job, err) => {
    console.log(`Job ${job.id} failed: ${err.message}`);
});


const startCronJob = () => {
    const cronExpression = '*/10 * * * * *'; // cada 10 segundos

    if (cron.validate(cronExpression)) {
        cron.schedule(cronExpression, () => {
            console.log('Adding synchronization job to the queue');
            syncQueue.add({});
        });

        console.log(`Cron job created with expression: ${cronExpression}`);
    } else {
        console.log(`Invalid cron expression: ${cronExpression}`);
    }
};



module.exports = {
    syncQueue,
    startCronJob
}