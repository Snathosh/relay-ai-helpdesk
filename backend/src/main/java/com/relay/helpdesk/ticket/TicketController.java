package com.relay.helpdesk.ticket;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tickets")
public class TicketController {
    private final TicketService ticketService;

    public TicketController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    @GetMapping
    public List<TicketService.TicketResponse> list(Authentication authentication) {
        return ticketService.list(authentication.getName());
    }

    @GetMapping("/{id}")
    public TicketService.TicketResponse find(@PathVariable String id, Authentication authentication) {
        return ticketService.find(authentication.getName(), id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TicketService.TicketResponse create(@Valid @RequestBody CreateTicket request, Authentication authentication) {
        return ticketService.create(authentication.getName(), request.title(), request.description());
    }

    public record CreateTicket(
            @NotBlank @Size(max = 180) String title,
            @Size(max = 5000) String description) { }
}
