package com.relay.helpdesk.ticket;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class SupportTicketTools {
    private final TicketService ticketService;

    public SupportTicketTools(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    @Tool(description = "Create a support ticket when the user asks for human help or confirms they want a ticket.")
    public String createSupportTicket(
            @ToolParam(description = "A concise summary of the support issue") String title,
            @ToolParam(description = "Details and troubleshooting context supplied by the user") String description) {
        TicketService.TicketResponse ticket = ticketService.create(currentUserEmail(), title, description);
        return "Created support ticket " + ticket.id() + " with status " + ticket.status() + ".";
    }

    @Tool(description = "Look up the current status of a support ticket by its ID, for example HD-1234ABCD.")
    public String checkTicketStatus(@ToolParam(description = "The ticket ID") String ticketId) {
        try {
            TicketService.TicketResponse ticket = ticketService.find(currentUserEmail(), ticketId);
            return "Ticket " + ticket.id() + " (" + ticket.title() + ") is " + ticket.status() + ".";
        } catch (TicketService.TicketNotFoundException exception) {
            return exception.getMessage();
        }
    }

    private String currentUserEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalStateException("An authenticated user is required to use ticket tools.");
        }
        return authentication.getName();
    }
}
