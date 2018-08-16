%global debug_package %{nil}
%global __strip /bin/true

Name:           verification
Version:        %{ver}
Release:        %{rel}%{?dist}

Summary:	verification

Group:		SDS
License:	GPL
URL:		http://github.com/journeymidnight
Source0:	%{name}-%{version}-%{rel}.tar.gz
BuildRoot:	%(mktemp -ud %{_tmppath}/%{name}-%{version}-%{release}-XXXXXX)

%description


%prep
%setup -q -n %{name}-%{version}-%{rel}

%build

%install
mkdir -p  %{buildroot}/binaries/verification
mv verification.service %{buildroot}/etc/systemd/system/multi-user.target.wants/verification.service
cp -r *   %{buildroot}/binaries/verification/

#ceph confs ?

%post
systemctl start verification


%preun

%clean
rm -rf %{buildroot}

%files
%defattr(-,root,root,-)
/binaries/verification/*

%changelog
