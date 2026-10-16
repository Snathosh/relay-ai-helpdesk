package com.relay.helpdesk.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserAccountService accounts;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final SessionAuthenticationStrategy sessionAuthenticationStrategy;

    public AuthController(
            UserAccountService accounts,
            AuthenticationManager authenticationManager,
            SecurityContextRepository securityContextRepository,
            SessionAuthenticationStrategy sessionAuthenticationStrategy) {
        this.accounts = accounts;
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
        this.sessionAuthenticationStrategy = sessionAuthenticationStrategy;
    }

    @PostMapping("/register")
    public AuthResponse register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse) {
        UserAccount account = accounts.register(request.email(), request.name(), request.password());
        return authenticate(account.getEmail(), request.password(), servletRequest, servletResponse);
    }

    @PostMapping("/login")
    public AuthResponse login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse) {
        return authenticate(request.email().trim(), request.password(), servletRequest, servletResponse);
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken token) {
        return Map.of("token", token.getToken());
    }

    @GetMapping("/me")
    public AuthResponse currentUser(Authentication authentication) {
        return AuthResponse.from(accounts.findByEmail(authentication.getName()));
    }

    @PostMapping("/logout")
    public void logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
        SecurityContextHolder.clearContext();
    }

    private AuthResponse authenticate(
            String email,
            String password,
            HttpServletRequest request,
            HttpServletResponse response) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(email, password));
            sessionAuthenticationStrategy.onAuthentication(authentication, request, response);
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);
            securityContextRepository.saveContext(context, request, response);
            UserAccount account = accounts.findByEmail(authentication.getName());
            return AuthResponse.from(account);
        } catch (AuthenticationException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password.");
        }
    }

    public record RegisterRequest(
            @NotBlank @Size(min = 2, max = 80) String name,
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(min = 10, max = 72) String password) { }

    public record LoginRequest(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(max = 72) String password) { }

    public record AuthResponse(String name, String email, String initials) {
        static AuthResponse from(UserAccount account) {
            String initials = account.getDisplayName().trim().substring(0, 1).toUpperCase();
            return new AuthResponse(account.getDisplayName(), account.getEmail(), initials);
        }
    }
}
