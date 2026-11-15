import time
import json
from typing import Optional, List, Dict, Any, Tuple
import redis
import fakeredis
from app.config import settings
from app.utils.logger import logger


class RedisBroker:
    def __init__(self, redis_url: str = settings.REDIS_URL):
        self.redis_url = redis_url
        self.client = self._connect()

    def _connect(self) -> redis.Redis:
        try:
            client = redis.Redis.from_url(
                self.redis_url,
                decode_responses=True,
                socket_connect_timeout=0.5,
                socket_timeout=1.0
            )
            client.ping()
            logger.info(f"Connected to Redis at {self.redis_url}")
            return client
        except Exception as e:
            if settings.USE_FAKE_REDIS_FALLBACK:
                logger.warning(f"Could not connect to Redis at {self.redis_url} ({e}). Falling back to high-performance in-memory FakeRedis.")
                return fakeredis.FakeRedis(decode_responses=True)
            else:
                raise e

    def _ready_key(self, queue: str) -> str:
        return f"queueflow:queue:{queue}"

    def _delayed_key(self, queue: str) -> str:
        return f"queueflow:delayed:{queue}"

    def _dlq_key(self) -> str:
        return "queueflow:dead_letter"

    def enqueue(self, job_id: str, queue: str = "default") -> int:
        """Push a job ID to the ready queue."""
        key = self._ready_key(queue)
        length = self.client.rpush(key, job_id)
        # Register queue in known queues set
        self.client.sadd("queueflow:known_queues", queue)
        return length

    def schedule_delayed(self, job_id: str, run_at_epoch: float, queue: str = "default") -> bool:
        """Schedule a job to be ready at a future epoch timestamp (exponential backoff retry)."""
        key = self._delayed_key(queue)
        self.client.zadd(key, {job_id: run_at_epoch})
        self.client.sadd("queueflow:known_queues", queue)
        return True

    def move_ready_delayed_jobs(self, queue: str = "default") -> int:
        """
        Check delayed ZSET for any jobs whose scheduled execution time has arrived,
        and atomically move them to the ready list.
        """
        delayed_key = self._delayed_key(queue)
        ready_key = self._ready_key(queue)
        now = time.time()

        # Fetch all items with score <= now
        ready_job_ids = self.client.zrangebyscore(delayed_key, min=0, max=now)
        moved = 0
        if ready_job_ids:
            for job_id in ready_job_ids:
                # Remove from delayed and push to ready queue
                removed = self.client.zrem(delayed_key, job_id)
                if removed:
                    self.client.rpush(ready_key, job_id)
                    moved += 1
        return moved

    def dequeue(self, queues: Optional[List[str]] = None, timeout: int = 1) -> Optional[Tuple[str, str]]:
        """
        Dequeue the next ready job.
        Returns tuple of (queue_name, job_id) or None.
        """
        if not queues:
            queues = ["default"]

        # First, migrate any delayed jobs that are now ready
        for q in queues:
            self.move_ready_delayed_jobs(q)

        # Poll queues in order of priority
        keys = [self._ready_key(q) for q in queues]
        try:
            # blpop returns (key, value) or None
            res = self.client.blpop(keys, timeout=timeout)
            if res:
                key, job_id = res
                queue_name = key.replace("queueflow:queue:", "")
                return queue_name, job_id
        except Exception as e:
            logger.error(f"Error during dequeue: {e}")
            return None

        return None

    def enqueue_dead_letter(self, job_id: str, reason: str = "") -> int:
        """Push permanently failed job to dead-letter queue."""
        data = json.dumps({"job_id": job_id, "reason": reason, "timestamp": time.time()})
        return self.client.rpush(self._dlq_key(), data)

    def get_queue_length(self, queue: str = "default") -> int:
        return self.client.llen(self._ready_key(queue))

    def get_delayed_length(self, queue: str = "default") -> int:
        return self.client.zcard(self._delayed_key(queue))

    def get_dlq_length(self) -> int:
        return self.client.llen(self._dlq_key())

    def get_known_queues(self) -> List[str]:
        queues = list(self.client.smembers("queueflow:known_queues"))
        if "default" not in queues:
            queues.append("default")
        return sorted(queues)

    def get_all_queue_metrics(self) -> Dict[str, Dict[str, int]]:
        queues = self.get_known_queues()
        metrics = {}
        for q in queues:
            metrics[q] = {
                "ready": self.get_queue_length(q),
                "delayed": self.get_delayed_length(q)
            }
        return metrics

    def flush_all(self):
        """Used in test fixtures."""
        self.client.flushall()


# Global broker singleton
broker = RedisBroker()
