
Build and Run the app inside a controlled docker container
```bash
docker-compose up --build -d

npm run build
```

Run producer
```bash
npm run start:producer
```

Run consumer using promisses for parallelism, and one child_process for each promisse
```bash
npm run start:consumer
```

Run consumer using cluster with child_process to execute each batch in parallel
```bash
npm run start:consumer-cluster
```
