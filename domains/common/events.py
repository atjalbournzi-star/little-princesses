# -*- coding: utf-8 -*-
"""
Lightweight In-Process Domain Event Dispatcher for Little Princesses ERP
Decouples domain interactions (e.g. Inventory -> Accounting, Sales -> Production).
"""

import datetime
from typing import Callable, Dict, List

class DomainEvent:
    def __init__(self, name: str, payload: dict, entity_id: str = None):
        self.name = name
        self.payload = payload
        self.entity_id = entity_id
        self.timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()

    def __repr__(self):
        return f"<DomainEvent: {self.name} (Entity: {self.entity_id}) at {self.timestamp}>"

class EventDispatcher:
    def __init__(self):
        self._subscribers: Dict[str, List[Callable[[DomainEvent], None]]] = {}

    def subscribe(self, event_name: str, handler: Callable[[DomainEvent], None]):
        if event_name not in self._subscribers:
            self._subscribers[event_name] = []
        if handler not in self._subscribers[event_name]:
            self._subscribers[event_name].append(handler)

    def unsubscribe(self, event_name: str, handler: Callable[[DomainEvent], None]):
        if event_name in self._subscribers and handler in self._subscribers[event_name]:
            self._subscribers[event_name].remove(handler)

    def publish(self, event: DomainEvent) -> List[dict]:
        """Dispatches an event to all registered listeners and returns results."""
        results = []
        listeners = self._subscribers.get(event.name, [])
        for listener in listeners:
            try:
                res = listener(event)
                results.append({"listener": getattr(listener, "__name__", str(listener)), "success": True, "result": res})
            except Exception as e:
                results.append({"listener": getattr(listener, "__name__", str(listener)), "success": False, "error": str(e)})
        return results

    def clear(self):
        self._subscribers.clear()

# Global event dispatcher singleton
dispatcher = EventDispatcher()
