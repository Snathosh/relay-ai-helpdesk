package com.relay.helpdesk.ticket;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SupportTicketRepository extends JpaRepository<SupportTicket, String> {
    List<SupportTicket> findAllByOwnerEmailIgnoreCaseOrderByCreatedAtDesc(String ownerEmail);
    Optional<SupportTicket> findByIdIgnoreCaseAndOwnerEmailIgnoreCase(String id, String ownerEmail);
}
