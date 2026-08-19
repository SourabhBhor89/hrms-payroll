package com.company.hrms.service.impl;

import com.company.hrms.dto.request.CreateProfileChangeRequest;
import com.company.hrms.dto.response.ProfileChangeRequestResponse;
import com.company.hrms.entity.Employee;
import com.company.hrms.entity.EmployeeProfileChangeRequest;
import com.company.hrms.repository.EmployeeProfileChangeRequestRepository;
import com.company.hrms.repository.EmployeeRepository;
import com.company.hrms.service.EmployeeProfileChangeService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class EmployeeProfileChangeServiceImpl implements EmployeeProfileChangeService {

    private final EmployeeProfileChangeRequestRepository requestRepository;
    private final EmployeeRepository employeeRepository;

    @Override
    public ProfileChangeRequestResponse createProfileChangeRequest(CreateProfileChangeRequest request, Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found with ID: " + employeeId));

        // Get current value based on field type
        String oldValue = getCurrentFieldValue(employee, request.getFieldType());

        // Check if there's already a pending request for the same field
        List<EmployeeProfileChangeRequest> pendingRequests = requestRepository
                .findByEmployeeIdAndStatus(employeeId, EmployeeProfileChangeRequest.ProfileChangeStatus.PENDING);
        
        boolean hasPendingSameField = pendingRequests.stream()
                .anyMatch(r -> r.getFieldType().equals(request.getFieldType()));
        
        if (hasPendingSameField) {
            throw new IllegalStateException("You already have a pending request for " + getFieldTypeDisplayName(request.getFieldType()) + ". Please wait for it to be processed before submitting another request.");
        }

        // Validate that new value is different from old value
        if (oldValue != null && oldValue.equals(request.getNewValue())) {
            throw new IllegalStateException("New value is the same as current value. No change needed for " + getFieldTypeDisplayName(request.getFieldType()) + ".");
        }

        EmployeeProfileChangeRequest profileChangeRequest = EmployeeProfileChangeRequest.builder()
                .employee(employee)
                .fieldType(request.getFieldType())
                .oldValue(oldValue)
                .newValue(request.getNewValue())
                .reason(request.getReason())
                .status(EmployeeProfileChangeRequest.ProfileChangeStatus.PENDING)
                .submittedAt(LocalDateTime.now())
                .build();

        EmployeeProfileChangeRequest saved = requestRepository.save(profileChangeRequest);
        return ProfileChangeRequestResponse.fromEntity(saved);
    }

    @Override
    public ProfileChangeRequestResponse approveProfileChangeRequest(Long requestId, Long approverId, String remarks) {
        EmployeeProfileChangeRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Profile change request not found with ID: " + requestId));

        if (request.getStatus() != EmployeeProfileChangeRequest.ProfileChangeStatus.PENDING) {
            throw new IllegalStateException("Only pending requests can be approved");
        }

        Employee approver = employeeRepository.findById(approverId)
                .orElseThrow(() -> new IllegalArgumentException("Approver not found with ID: " + approverId));

        // Update employee field
        updateEmployeeField(request.getEmployee(), request.getFieldType(), request.getNewValue());

        request.setStatus(EmployeeProfileChangeRequest.ProfileChangeStatus.APPROVED);
        request.setReviewedAt(LocalDateTime.now());
        request.setReviewedBy(approver);
        request.setReviewRemarks(remarks);

        EmployeeProfileChangeRequest saved = requestRepository.save(request);
        return ProfileChangeRequestResponse.fromEntity(saved);
    }

    @Override
    public ProfileChangeRequestResponse rejectProfileChangeRequest(Long requestId, Long approverId, String remarks) {
        EmployeeProfileChangeRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Profile change request not found with ID: " + requestId));

        if (request.getStatus() != EmployeeProfileChangeRequest.ProfileChangeStatus.PENDING) {
            throw new IllegalStateException("Only pending requests can be rejected");
        }

        Employee approver = employeeRepository.findById(approverId)
                .orElseThrow(() -> new IllegalArgumentException("Approver not found with ID: " + approverId));

        request.setStatus(EmployeeProfileChangeRequest.ProfileChangeStatus.REJECTED);
        request.setReviewedAt(LocalDateTime.now());
        request.setReviewedBy(approver);
        request.setReviewRemarks(remarks);

        EmployeeProfileChangeRequest saved = requestRepository.save(request);
        return ProfileChangeRequestResponse.fromEntity(saved);
    }

    @Override
    public ProfileChangeRequestResponse cancelProfileChangeRequest(Long requestId, Long employeeId) {
        EmployeeProfileChangeRequest request = requestRepository.findByEmployeeIdAndId(employeeId, requestId)
                .orElseThrow(() -> new IllegalArgumentException("Profile change request not found"));

        if (request.getStatus() != EmployeeProfileChangeRequest.ProfileChangeStatus.PENDING) {
            throw new IllegalStateException("Only pending requests can be cancelled");
        }

        request.setStatus(EmployeeProfileChangeRequest.ProfileChangeStatus.CANCELLED);
        EmployeeProfileChangeRequest saved = requestRepository.save(request);
        return ProfileChangeRequestResponse.fromEntity(saved);
    }

    @Override
    public List<ProfileChangeRequestResponse> getEmployeeProfileChangeRequests(Long employeeId) {
        List<EmployeeProfileChangeRequest> requests = requestRepository.findByEmployeeId(employeeId);
        return requests.stream()
                .map(ProfileChangeRequestResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    public Page<ProfileChangeRequestResponse> getPendingProfileChangeRequests(Pageable pageable) {
        Page<EmployeeProfileChangeRequest> requests = requestRepository.findByStatusOrderBySubmittedAtDesc(
                EmployeeProfileChangeRequest.ProfileChangeStatus.PENDING, pageable);
        return requests.map(ProfileChangeRequestResponse::fromEntity);
    }

    @Override
    public ProfileChangeRequestResponse getProfileChangeRequestById(Long requestId) {
        EmployeeProfileChangeRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Profile change request not found with ID: " + requestId));
        return ProfileChangeRequestResponse.fromEntity(request);
    }

    private String getCurrentFieldValue(Employee employee, String fieldType) {
        switch (fieldType.toUpperCase()) {
            case "PHONE":
                return employee.getPhone();
            case "ADDRESS":
                return employee.getAddress();
            case "CURRENT_ADDRESS":
                return employee.getCurrentAddress();
            case "PERMANENT_ADDRESS":
                return employee.getPermanentAddress();
            default:
                throw new IllegalArgumentException("Invalid field type: " + fieldType + ". Valid types are: PHONE, ADDRESS, CURRENT_ADDRESS, PERMANENT_ADDRESS");
        }
    }

    private void updateEmployeeField(Employee employee, String fieldType, String newValue) {
        switch (fieldType.toUpperCase()) {
            case "PHONE":
                employee.setPhone(newValue);
                break;
            case "ADDRESS":
                employee.setAddress(newValue);
                break;
            case "CURRENT_ADDRESS":
                employee.setCurrentAddress(newValue);
                break;
            case "PERMANENT_ADDRESS":
                employee.setPermanentAddress(newValue);
                break;
            default:
                throw new IllegalArgumentException("Invalid field type: " + fieldType);
        }
        employeeRepository.save(employee);
    }

    private String getFieldTypeDisplayName(String fieldType) {
        switch (fieldType.toUpperCase()) {
            case "PHONE":
                return "Phone Number";
            case "ADDRESS":
                return "Address";
            case "CURRENT_ADDRESS":
                return "Current Address";
            case "PERMANENT_ADDRESS":
                return "Permanent Address";
            default:
                return fieldType;
        }
    }
}
