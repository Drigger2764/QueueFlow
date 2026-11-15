import os
import sys
from app.database import init_db
from app.queue.worker import QueueFlowWorker
from app.utils.logger import logger


def main():
    logger.info("Initializing worker environment...")
    init_db()

    worker_id = os.getenv("WORKER_ID")
    queues_env = os.getenv("QUEUES", "default,critical,low")
    queues = [q.strip() for q in queues_env.split(",") if q.strip()]

    worker = QueueFlowWorker(worker_id=worker_id, queues=queues)
    worker.start()


if __name__ == "__main__":
    main()
