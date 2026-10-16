package com.relay.helpdesk.ticket;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.ResponseStatus;

@Service
public class TicketService {
    private final SupportTicketRepository repository;

    public TicketService(SupportTicketRepository repository) {
        this.repository = repository;
    }

    public List<TicketResponse> list(String ownerEmail) {
        return repository.findAllByOwnerEmailIgnoreCaseOrderByCreatedAtDesc(ownerEmail).stream().map(TicketResponse::from).toList();
    }

    public TicketResponse create(String ownerEmail, String title, String description) {
        SupportTicket ticket = repository.save(new SupportTicket(title.trim(), description == null ? "" : description.trim(), ownerEmail));
        return TicketResponse.from(ticket);
    }

    public TicketResponse find(String ownerEmail, String id) {
        return repository.findByIdIgnoreCaseAndOwnerEmailIgnoreCase(id, ownerEmail)
                .map(TicketResponse::from)
                .orElseThrow(() -> new TicketNotFoundException(id));
    }

    public record TicketResponse(String id, String title, String status, String updated) {
        static TicketResponse from(SupportTicket ticket) {
            return new TicketResponse(ticket.getId(), ticket.getTitle(), ticket.getStatus(), ticket.getCreatedAt().toString());
        }
    }

    @ResponseStatus(HttpStatus.NOT_FOUND)
    public static class TicketNotFoundException extends RuntimeException {
        public TicketNotFoundException(String id) {
            super("Ticket not found: " + id);
        }
    }
}
