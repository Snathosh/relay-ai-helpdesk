package com.relay.helpdesk.ticket;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "support_tickets")
public class SupportTicket {
    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(nullable = false, length = 5000)
    private String description;

    @Column(nullable = false, length = 254)
    private String ownerEmail;

    @Column(nullable = false, length = 24)
    private String status;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected SupportTicket() { }

    public SupportTicket(String title, String description, String ownerEmail) {
        this.title = title;
        this.description = description;
        this.ownerEmail = ownerEmail;
        this.status = "Open";
    }

    @PrePersist
    void prepareForInsert() {
        if (id == null) id = "HD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        if (createdAt == null) createdAt = Instant.now();
    }

    public String getId() { return id; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getOwnerEmail() { return ownerEmail; }
    public String getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
}
