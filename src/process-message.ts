process.on('message', async (message: { batch: any }) => {
  const { batch } = message;
  
  // Processar o batch
  const results = batch.map((item: any) => {
    const textFromMsg = Buffer.from(item.value.data).toString();
    return `Processed ${textFromMsg}`;
  });

  // simulate processing delay
  await new Promise(res => { setTimeout(res,1000) });

  // Enviar resultados de volta para o processo pai
  if (process.send) {
    process.send({ results });
  }
  
  process.exit(0);
});