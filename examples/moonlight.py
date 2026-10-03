"""A fictional queue worker for previewing the Moonlight Python palette."""

import asyncio
from dataclasses import dataclass


@dataclass
class Ticket:
    subject: str
    priority: int = 2


class QueueWorker:
    def __init__(self, name: str):
        self.name = name
        self.completed = 0

    async def resolve(self, ticket: Ticket, retries: int = 3) -> bool:
        # Keep the queue moving without losing the useful details.
        for attempt in range(retries):
            await asyncio.sleep(0.25)
            if ticket.priority <= 2:
                self.completed += 1
                print(f"{self.name}: resolved {ticket.subject}")
                return True
        return False


async def main():
    worker = QueueWorker(name="Luna")
    ticket = Ticket(subject="Search results need a tune-up", priority=1)
    resolved = await worker.resolve(ticket, retries=3)
    print("Ready for the next ticket", resolved)


if __name__ == "__main__":
    asyncio.run(main())
