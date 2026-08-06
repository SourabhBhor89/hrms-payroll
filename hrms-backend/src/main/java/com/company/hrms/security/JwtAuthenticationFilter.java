package com.company.hrms.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String token = extractToken(request);

        if (token == null) {
            Authentication authentication =
                    SecurityContextHolder.getContext().getAuthentication();

            if (authentication != null) {

                System.out.println("=================================");
                System.out.println("Authenticated User: "
                        + authentication.getName());

                System.out.println("Authorities: "
                        + authentication.getAuthorities());

                System.out.println("Authenticated: "
                        + authentication.isAuthenticated());

                System.out.println("=================================");
            }
            filterChain.doFilter(request, response);
            return;
        }

        try {

            String username = jwtService.extractUsername(token);

            if (username != null
                    && SecurityContextHolder
                    .getContext()
                    .getAuthentication() == null) {

                UserDetails userDetails =
                        userDetailsService.loadUserByUsername(username);

                if (jwtService.isTokenValid(
                        token,
                        userDetails.getUsername()
                )) {

                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities()
                            );

                    authentication.setDetails(
                            new WebAuthenticationDetailsSource()
                                    .buildDetails(request)
                    );

                    System.out.println("=================================");
                    System.out.println("JWT USER: " + authentication.getName());
                    System.out.println("AUTHORITIES: " + authentication.getAuthorities());
                    System.out.println("AUTHENTICATED: " + authentication.isAuthenticated());
                    System.out.println("=================================");

                    SecurityContextHolder
                            .getContext()
                            .setAuthentication(authentication);
                }
            }

        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            System.err.println("JWT authentication failed: Token is expired");
            SecurityContextHolder.clearContext();
        } catch (io.jsonwebtoken.security.SignatureException e) {
            System.err.println("JWT authentication failed: Signature verification failed");
            SecurityContextHolder.clearContext();
        } catch (io.jsonwebtoken.MalformedJwtException e) {
            System.err.println("JWT authentication failed: Malformed token");
            SecurityContextHolder.clearContext();
        } catch (io.jsonwebtoken.JwtException | IllegalArgumentException e) {
            System.err.println("JWT authentication failed: " + e.getMessage());
            SecurityContextHolder.clearContext();
        } catch (Exception e) {
            System.err.println("Unexpected error during JWT authentication: " + e.getClass().getName() + " - " + e.getMessage());
            e.printStackTrace();
            SecurityContextHolder.clearContext();
        }
        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null) {

            System.out.println("=================================");
            System.out.println("Authenticated User: "
                    + authentication.getName());

            System.out.println("Authorities: "
                    + authentication.getAuthorities());

            System.out.println("Authenticated: "
                    + authentication.isAuthenticated());

            System.out.println("=================================");
        }
        filterChain.doFilter(request, response);
    }

    private String extractToken(HttpServletRequest request) {

        String authorization =
                request.getHeader("Authorization");

        if (StringUtils.hasText(authorization)
                && authorization.startsWith("Bearer ")) {

            return authorization.substring(7);
        }

        return null;
    }
}