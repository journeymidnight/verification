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
npm install

%build

%install
mkdir -p %{buildroot}/root/.snmp/mibs
mkdir -p %{buildroot}/usr/lib/systemd/system
mkdir -p  %{buildroot}/binaries/verification
mv package/verification.service %{buildroot}/usr/lib/systemd/system
cp -r *   %{buildroot}/binaries/verification/

#ceph confs ?

%post
systemctl start verification
chkconfig verification on
curl -o /root/.snmp/mibs/JMD-STORAGE-MID.txt http://localhost:8083/JMD-STORAGE-MID.txt

%preun

%clean
rm -rf %{buildroot}

%files
%defattr(-,root,root,-)
/binaries/verification/*
/usr/lib/systemd/system/verification.service

%changelog

