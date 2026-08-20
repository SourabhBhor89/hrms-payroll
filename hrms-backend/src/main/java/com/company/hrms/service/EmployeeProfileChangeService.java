package com.company.hrms.service;

import com.company.hrms.dto.request.CreateProfileChangeRequest;
import com.company.hrms.dto.response.ProfileChangeRequestResponse;
import com.company.hrms.entity.EmployeeProfileChangeRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface EmployeeProfileChangeService {

    ProfileChangeRequestResponse createProfileChangeRequest(CreateProfileChangeRequest request, Long employeeId);

    ProfileChangeRequestResponse approveProfileChangeRequest(Long requestId, Long approverId, String remarks);

    ProfileChangeRequestResponse rejectProfileChangeRequest(Long requestId, Long approverId, String remarks);

    ProfileChangeRequestResponse cancelProfileChangeRequest(Long requestId, Long employeeId);

    List<ProfileChangeRequestResponse> getEmployeeProfileChangeRequests(Long employeeId);

    Page<ProfileChangeRequestResponse> getPendingProfileChangeRequests(Pageable pageable);

    Page<ProfileChangeRequestResponse> getAllProfileChangeRequests(Pageable pageable);

    ProfileChangeRequestResponse getProfileChangeRequestById(Long requestId);
}
